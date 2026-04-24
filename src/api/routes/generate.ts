import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { books, generationJobs, subscriptions, users, tokenTransactions } from "../database/schema";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";
import OpenAI from "openai";
import { generateCoverBuffer } from "../lib/coverGen";

const generateRoutes = new Hono();
generateRoutes.use(authMiddleware);

// POST /api/generate/enhance — AI prompt enhancement
generateRoutes.post("/enhance", authenticatedOnly, async (c) => {
  const { topic, length } = await c.req.json() as { topic: string; length: string };
  if (!topic?.trim()) return c.json({ error: "Topic is required" }, 400);

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  const lengthGuide = length === "short"
    ? "a short quick-start guide (around 3,000 words, 8-12 pages)"
    : "a medium in-depth report (around 8,000 words, 20-25 pages)";

  const res = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are an expert content strategist who takes rough topic ideas and transforms them into detailed, specific, high-converting book prompts. You add target audience, key pain points, desired outcomes, tone, and specific angles."
      },
      {
        role: "user",
        content: `The user wants to create ${lengthGuide} about: "${topic}"\n\nRewrite this into a detailed, specific prompt for an AI book generator. Include: target audience, their biggest problems, what transformation the book delivers, the tone/style, and any specific angles or unique value. Return ONLY the enhanced prompt text, no explanation, no preamble.`
      }
    ],
    max_tokens: 500,
  });

  return c.json({ enhancedPrompt: res.choices[0].message.content?.trim() });
});

// POST /api/generate/start — kick off generation
generateRoutes.post("/start", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { keyword, originalTopic, length } = await c.req.json() as { keyword: string; originalTopic?: string; length?: string };

  if (!keyword?.trim()) return c.json({ message: "Keyword is required" }, 400);

  // Check subscription limits
  let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  
  if (!sub) {
    // Auto-create starter subscription
    const now = new Date();
    const monthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    sub = {
      id: crypto.randomUUID(),
      userId: user.id,
      tier: "starter",
      stripeSubscriptionId: null,
      monthlyBookLimit: 5,
      booksGeneratedThisMonth: 0,
      monthResetDate: monthReset,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(subscriptions).values(sub);
  }

  // Reset monthly counter if month has passed
  if (sub.monthResetDate && new Date() > new Date(sub.monthResetDate)) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    await db.update(subscriptions).set({ booksGeneratedThisMonth: 0, monthResetDate: nextMonth }).where(eq(subscriptions.userId, user.id));
    sub.booksGeneratedThisMonth = 0;
  }

  // Check book limit
  if (sub.booksGeneratedThisMonth >= sub.monthlyBookLimit) {
    return c.json({ 
      message: `You've reached your monthly book limit (${sub.monthlyBookLimit}). Upgrade your plan to create more books.`,
      plan: sub.tier,
      limit: sub.monthlyBookLimit,
      used: sub.booksGeneratedThisMonth,
    }, 403);
  }

  // Check token availability
  const TOKENS_PER_BOOK = 50000;
  const [user_data] = await db.select({ tokenBalance: users.tokenBalance }).from(users).where(eq(users.id, user.id));
  const purchasedTokens = user_data?.tokenBalance || 0;
  const remainingAllowance = sub.monthlyTokenAllowance - sub.tokensUsedThisMonth;
  const totalAvailable = remainingAllowance + purchasedTokens;

  if (totalAvailable < TOKENS_PER_BOOK) {
    return c.json({
      message: "Insufficient tokens to generate book",
      tokensNeeded: TOKENS_PER_BOOK,
      tokensAvailable: totalAvailable,
      redirect: "/dashboard/tokens",
    }, 402);
  }

  const bookId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const now = new Date();

  await db.insert(books).values({
    id: bookId,
    sellerId: user.id,
    title: `Generating: ${originalTopic || keyword}`,
    keyword: keyword.trim(),
    status: "generating",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(generationJobs).values({
    id: jobId,
    bookId,
    userId: user.id,
    status: "running",
    currentStep: "Starting...",
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ bookId, jobId });
});

// GET /api/generate/stream/:bookId — SSE stream for the pipeline
generateRoutes.get("/stream/:bookId", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();

  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book || book.sellerId !== user.id) {
    return c.json({ message: "Book not found" }, 404);
  }

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const keyword = book.keyword;
        const bookLength: string = (book as { length?: string }).length || "medium";
        const wordsPerSection = bookLength === "short" ? "200-300" : "400-600";
        const sectionCount = bookLength === "short" ? "4-5" : "6-7";

        // Step 1: Brainstorm pains
        send("step", { step: "brainstorming", message: "Analyzing customer pain points..." });
        await db.update(generationJobs).set({ currentStep: "brainstorming", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const painsRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are a veteran market-research copywriter who uncovers deep customer pains and frustrations with clear, bullet-point precision." },
            { role: "user", content: `List the 10 biggest pains and frustrations people have around "${keyword}". Return each as a concise bullet.` }
          ]
        });
        const pains = painsRes.choices[0].message.content!;
        send("progress", { step: "brainstorming", done: true });

        // Step 2: Solutions
        send("step", { step: "solutions", message: "Generating targeted solutions..." });
        await db.update(generationJobs).set({ currentStep: "solutions", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const solutionsRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are a seasoned problem-solving strategist who turns customer pains into clear, actionable solutions." },
            { role: "user", content: `Below are the top pains around "${keyword}":\n\n${pains}\n\nFor each pain, write one concise solution. Return as a numbered list.` }
          ]
        });
        const solutions = solutionsRes.choices[0].message.content!;
        send("progress", { step: "solutions", done: true });

        // Step 3: $100M Offer
        send("step", { step: "offer", message: "Crafting your $100M Offer..." });
        await db.update(generationJobs).set({ currentStep: "offer", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const offerRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are an expert direct-response strategist who crafts irresistible offers using Alex Hormozi's $100M Offers framework." },
            { role: "user", content: `Topic: "${keyword}"\n\nTop customer pains:\n${pains}\n\nApply the $100M Offers framework (Dream Outcome, Perceived Likelihood, Time Delay, Effort & Sacrifice). Craft a single compelling offer.\n\nReturn in this format:\n• **Offer Title:** …\n• **Dream Outcome:** …\n• **Perceived Likelihood:** …\n• **Time Delay:** …\n• **Effort & Sacrifice:** …\n• **Key Features & Bonuses:** (3-5 bullets)` }
          ]
        });
        const offer = offerRes.choices[0].message.content!;
        send("progress", { step: "offer", done: true });

        // Step 4: Title
        send("step", { step: "title", message: "Creating the perfect title..." });
        await db.update(generationJobs).set({ currentStep: "title", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const titleRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are a seasoned marketing copywriter who crafts scroll-stopping ebook titles that promise a clear, tangible result." },
            { role: "user", content: `Here's the offer:\n\n${offer}\n\n1. Propose three punchy ebook titles (each under 12 words).\n2. Pick the single best title.\n\nReturn as JSON:\n{"titles":["Title 1","Title 2","Title 3"],"selectedTitle":"The winner","rationale":"Why this one converts best"}` }
          ],
          response_format: { type: "json_object" }
        });
        const titleJson = JSON.parse(titleRes.choices[0].message.content!);
        const selectedTitle = titleJson.selectedTitle;
        send("progress", { step: "title", done: true, data: { title: selectedTitle } });

        // Step 5: Outline
        send("step", { step: "outline", message: "Building your ebook outline..." });
        await db.update(generationJobs).set({ currentStep: "outline", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const outlineRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are an expert ebook outline strategist and educational content architect." },
            { role: "user", content: `We're writing an ebook titled "${selectedTitle}".\n\nCreate a detailed outline with ${sectionCount} main sections:\n1. Introduction (hook + why this matters for ${keyword})\n2. Main Sections (benefit-driven headings, 3-5 bullets each)\n3. Conclusion & 3-Step Action Plan\n\nReturn as numbered list with sub-bullets.` }
          ]
        });
        const outline = outlineRes.choices[0].message.content!;
        send("progress", { step: "outline", done: true });

        // Step 6: Cover image — two-stage: LLM crafts the image prompt, then gpt-image-1 generates it
        send("step", { step: "cover", message: "Designing your book cover..." });
        await db.update(generationJobs).set({ currentStep: "cover", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        let coverUrl = "";
        let coverDataUrl = ""; // base64 for embedding into HTML
        try {
          const imgBuffer = await generateCoverBuffer(openai, selectedTitle, keyword);
          const coverKey = `covers/${bookId}.png`;
          await c.env.BUCKET.put(coverKey, imgBuffer, {
            httpMetadata: { contentType: "image/png" }
          });
          coverUrl = `/api/assets/${coverKey}`;
          // Build base64 data URL for embedding directly into the ebook HTML
          const arr = new Uint8Array(imgBuffer);
          let b64 = "";
          for (let i = 0; i < arr.length; i += 8192) b64 += String.fromCharCode(...arr.subarray(i, i + 8192));
          coverDataUrl = `data:image/png;base64,${btoa(b64)}`;
          send("progress", { step: "cover", done: true, data: { coverUrl } });
        } catch (err) {
          console.error("Cover generation failed:", err);
          send("progress", { step: "cover", done: true, data: { coverUrl: "" } });
        }

        // Step 7: Write full ebook — no artificial token cap, let gpt-4.1 write fully
        send("step", { step: "writing", message: "Writing your full ebook..." });
        await db.update(generationJobs).set({ currentStep: "writing", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const contentRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are a veteran nonfiction ghostwriter who turns outlines into engaging, easy-to-read ebooks at a 6th-grade reading level while still sounding professional and motivating." },
            { role: "user", content: `Title: "${selectedTitle}"\nTarget niche: "${keyword}"\n\nBelow is the approved outline:\n\n${outline}\n\nWrite the full ebook using that structure:\n• Keep every heading exactly as listed.\n• For each section, expand its bullet points into ${wordsPerSection} words of clear prose.\n• Tone: friendly, confident, action-oriented (6th-grade reading level).\n• Use short paragraphs and bold key phrases for emphasis.\n• After the Conclusion, include the 3-step action plan as a numbered list.\n\nReturn the completed manuscript as plain text — no commentary, no JSON.` }
          ],
        });
        const ebookContent = contentRes.choices[0].message.content!;
        send("progress", { step: "writing", done: true });

        // Step 8: Value enhancer
        send("step", { step: "bonuses", message: "Creating bonus materials..." });
        await db.update(generationJobs).set({ currentStep: "bonuses", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        const veRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "You are a product strategist who creates high-perceived-value bonuses and upsells." },
            { role: "user", content: `Title: "${selectedTitle}"\nTopic: "${keyword}"\nOffer: ${offer}\n\n1. Propose 5 high-value bonuses (name, format, benefit)\n2. Suggest a paid One-Time Offer ($97-$297)\n\nReturn JSON:\n{"bonuses":[{"name":"","format":"","benefit":""}],"oto":{"name":"","price":97,"description":"","deliverables":[]}}` }
          ],
          response_format: { type: "json_object" }
        });
        const veData = JSON.parse(veRes.choices[0].message.content!);
        send("progress", { step: "bonuses", done: true });

        // Generate clean 2-sentence book description (no markdown)
        const descRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: "Write a clean, compelling 2-sentence book description for a sales page. No markdown, no asterisks, no bullet points — plain prose only." },
            { role: "user", content: `Book title: "${selectedTitle}"\nTopic/niche: "${keyword}"\nWrite 2 sentences that describe what this book teaches and who it's for.` }
          ],
          max_tokens: 120,
        });
        const cleanDescription = descRes.choices[0].message.content?.trim() ?? "";

        // Auto-assign category based on keyword/topic
        const VALID_CATEGORIES = ["Business", "Health", "Education", "Finance", "Fitness", "Marketing", "Technology", "Self-Help", "Other"];
        let autoCategory = "Other";
        try {
          const catRes = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
              { role: "system", content: `You are a book categorization assistant. Pick exactly ONE category from this list that best fits the book topic: ${VALID_CATEGORIES.join(", ")}. Reply with just the category name, nothing else.` },
              { role: "user", content: `Book title: "${selectedTitle}"\nTopic: "${keyword}"` }
            ],
            max_tokens: 10,
          });
          const suggested = catRes.choices[0].message.content?.trim() ?? "";
          if (VALID_CATEGORIES.includes(suggested)) autoCategory = suggested;
        } catch { /* keep Other */ }

        // Step 9: Generate PDF
        send("step", { step: "pdf", message: "Generating your PDF..." });
        await db.update(generationJobs).set({ currentStep: "pdf", updatedAt: new Date() })
          .where(eq(generationJobs.bookId, bookId));

        // Build HTML for PDF
        // Use base64 data URL so the cover is embedded directly — no external dependency
        const htmlContent = buildEbookHTML(selectedTitle, ebookContent, coverDataUrl || "");
        
        // Store HTML as the "PDF" (we'll convert client-side or just serve HTML for download)
        const pdfKey = `books/${bookId}/ebook.html`;
        await c.env.BUCKET.put(pdfKey, htmlContent, {
          httpMetadata: { contentType: "text/html" }
        });

        const valueEnhancerHtml = buildValueEnhancerHTML(selectedTitle, veData);
        const veKey = `books/${bookId}/value-enhancer.html`;
        await c.env.BUCKET.put(veKey, valueEnhancerHtml, {
          httpMetadata: { contentType: "text/html" }
        });

        send("progress", { step: "pdf", done: true });

        // Update book record
        await db.update(books).set({
          title: selectedTitle,
          description: cleanDescription,
          offer,
          outline,
          coverUrl,
          category: autoCategory,
          pdfUrl: `/api/assets/${pdfKey}`,
          valueEnhancerUrl: `/api/assets/${veKey}`,
          status: "draft",
          updatedAt: new Date(),
        }).where(eq(books.id, bookId));

        await db.update(generationJobs).set({
          status: "completed",
          currentStep: "done",
          updatedAt: new Date(),
        }).where(eq(generationJobs.bookId, bookId));

        // Increment subscription counter + deduct tokens
        const [userSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
        if (userSub) {
          await db.update(subscriptions).set({ 
            booksGeneratedThisMonth: userSub.booksGeneratedThisMonth + 1 
          }).where(eq(subscriptions.userId, userId));

          // Deduct tokens (50,000 per book)
          const TOKENS_PER_BOOK = 50000;
          const remainingAllowance = userSub.monthlyTokenAllowance - userSub.tokensUsedThisMonth;
          
          if (remainingAllowance >= TOKENS_PER_BOOK) {
            // Use monthly allowance first
            await db.update(subscriptions).set({
              tokensUsedThisMonth: userSub.tokensUsedThisMonth + TOKENS_PER_BOOK
            }).where(eq(subscriptions.userId, userId));
          } else {
            // Use remaining allowance + purchased tokens
            const tokensFromPurchased = TOKENS_PER_BOOK - remainingAllowance;
            await db.update(subscriptions).set({
              tokensUsedThisMonth: userSub.monthlyTokenAllowance
            }).where(eq(subscriptions.userId, userId));
            await db.update(users).set({
              tokenBalance: Math.max(0, (await db.select({ tokenBalance: users.tokenBalance }).from(users).where(eq(users.id, userId)))[0]?.tokenBalance || 0 - tokensFromPurchased)
            }).where(eq(users.id, userId));
          }

          // Log transaction
          await db.insert(tokenTransactions).values({
            id: crypto.randomUUID(),
            userId,
            amount: -TOKENS_PER_BOOK,
            type: "generation",
            description: `Generated book: ${selectedTitle}`,
            createdAt: new Date(),
          });
        }

        send("done", { 
          bookId,
          title: selectedTitle,
          coverUrl,
          offer,
          bonuses: veData.bonuses,
          oto: veData.oto,
        });

      } catch (error: unknown) {
        console.error("Generation error:", error);
        const errMsg = error instanceof Error ? error.message : "Generation failed";
        
        await db.update(generationJobs).set({
          status: "failed",
          errorMessage: errMsg,
          updatedAt: new Date(),
        }).where(eq(generationJobs.bookId, bookId));

        await db.update(books).set({
          status: "draft",
          updatedAt: new Date(),
        }).where(eq(books.id, bookId));

        send("error", { message: errMsg });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// GET /api/generate/status/:bookId
generateRoutes.get("/status/:bookId", authenticatedOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user")!;
  const { bookId } = c.req.param();

  const [job] = await db.select().from(generationJobs)
    .where(eq(generationJobs.bookId, bookId));

  if (!job || job.userId !== user.id) {
    return c.json({ message: "Job not found" }, 404);
  }

  return c.json(job);
});

function buildEbookHTML(title: string, content: string, coverUrl: string): string {
  const bodyHtml = content
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .split('\n')
    .map(line => {
      const t = line.trim();
      if (!t) return '';
      if (t.startsWith('<h') || t.startsWith('<ul') || t.startsWith('<ol') || t.startsWith('<li')) return t;
      if (t.startsWith('- ') || t.startsWith('• ')) return `<li>${t.slice(2)}</li>`;
      if (/^\d+\.\s/.test(t)) return `<li>${t.replace(/^\d+\.\s/, '')}</li>`;
      return `<p>${t}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 16px; line-height: 1.7; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 2em; color: #0e0e0e; margin-top: 2em; }
    h2 { font-size: 1.5em; color: #1a1a1a; margin-top: 1.8em; border-bottom: 2px solid #e85d26; padding-bottom: 8px; }
    h3 { font-size: 1.2em; color: #333; }
    p { margin: 0.8em 0; }
    strong { font-weight: bold; color: #0e0e0e; }
    li { margin: 0.4em 0; }
    .cover { page-break-after: always; text-align: center; margin-bottom: 2em; }
    .cover img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="cover">
    ${coverUrl ? `<img src="${coverUrl}" alt="${title} Cover" />` : ''}
  </div>
  ${bodyHtml}
</body>
</html>`;
}

function buildValueEnhancerHTML(title: string, veData: { bonuses?: Array<{name: string; format: string; benefit: string}>; oto?: { name: string; price: number; description: string; deliverables: string[] } }): string {
  const bonuses = veData.bonuses || [];
  const oto = veData.oto || {};

  const bonusHtml = bonuses.map((b: {name: string; format: string; benefit: string}) => 
    `<li><strong>${b.name}</strong> (${b.format}) — ${b.benefit}</li>`
  ).join('');

  const otoDeliverables = (oto.deliverables || []).map((d: string) => `<li>${d}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Value Enhancer — ${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2em; color: #0e0e0e; }
    h2 { font-size: 1.4em; color: #e85d26; border-bottom: 2px solid #e85d26; padding-bottom: 6px; }
    li { margin: 0.5em 0; }
    strong { font-weight: bold; }
    .oto { background: #f5f5f5; padding: 20px; border-left: 4px solid #e85d26; margin-top: 2em; }
  </style>
</head>
<body>
  <h1>Bonus Vault & Value Enhancer</h1>
  <p>For: <em>${title}</em></p>
  
  <h2>Bonus Bundle (5 High-Value Bonuses)</h2>
  <ul>${bonusHtml}</ul>
  
  <div class="oto">
    <h2>One-Time Offer — ${oto.name || ''} ($${oto.price || ''})</h2>
    <p>${oto.description || ''}</p>
    <ul>${otoDeliverables}</ul>
  </div>
</body>
</html>`;
}

export { generateRoutes };
