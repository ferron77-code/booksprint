import OpenAI from "openai";

/**
 * Shared two-stage cover generation helper.
 * Stage 1: GPT-4.1 crafts a detailed image prompt from title + keyword
 * Stage 2: gpt-image-1 generates the cover from that prompt
 * Returns base64 PNG buffer.
 */
export async function generateCoverBuffer(
  openai: OpenAI,
  title: string,
  keyword: string
): Promise<Buffer> {
  // Stage 1: craft image prompt
  const promptRes = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are an award-winning creative director and ebook cover designer. Your job is to turn any topic, offer, and audience into a single, scroll-stopping image prompt.",
      },
      {
        role: "user",
        content: `We're publishing an ebook titled "${title}" for people interested in "${keyword}".\n\n1. Infer the primary demographic most likely to buy (age range, gender, profession, vibe).\n2. Write a detailed image generation prompt that includes:\n- A central figure or scene representing that demographic\n- Visual metaphors or icons tied to the core topic\n- Bold, legible typography for the title "${title}" prominently displayed\n- High-contrast palette — dark background plus ONE vibrant accent color chosen for high conversion\n- Modern, minimalist layout\n- Portrait orientation, 2:3 aspect ratio\n- Professional ebook cover aesthetic\n\nReturn ONLY the image prompt text, nothing else.`,
      },
    ],
    max_tokens: 400,
  });

  const imagePrompt = promptRes.choices[0].message.content!.trim();

  // Stage 2: generate image
  const coverRes = await openai.images.generate({
    model: "gpt-image-1",
    prompt: imagePrompt,
    size: "1024x1536",
    quality: "medium",
    n: 1,
  } as Parameters<typeof openai.images.generate>[0]);

  const b64 = (coverRes.data[0] as { b64_json?: string }).b64_json;
  if (!b64) throw new Error("No image data returned from gpt-image-1");

  return Buffer.from(b64, "base64");
}
