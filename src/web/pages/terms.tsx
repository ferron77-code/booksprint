import { Link } from "wouter";
import { Navbar } from "../components/Navbar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="mb-12 pb-8 border-b border-[#2a2a2a]">
            <p className="text-[#e85d26] text-xs font-semibold uppercase tracking-widest mb-3">Legal</p>
            <h1 className="font-display text-5xl text-white tracking-wide mb-4">
              TERMS OF <span className="text-[#e85d26]">SERVICE</span>
            </h1>
            <p className="text-[#a09890] text-sm">
              <strong className="text-white">Into All The World Digital Products</strong><br />
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-10 text-[#a09890] leading-relaxed">

            <section>
              <h2 className="text-white font-bold text-xl mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the PDF's To Go platform operated by <strong className="text-white">Into All The World Digital Products</strong> ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services.
              </p>
              <p className="mt-3">
                These terms apply to all users of the platform, including buyers, sellers, and visitors.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">2. Description of Service</h2>
              <p>
                Into All The World Digital Products operates an AI-powered digital publishing and marketplace platform ("PDF's To Go") that allows users to:
              </p>
              <ul className="list-none space-y-2 mt-3">
                {[
                  "Create digital ebooks and documents using AI-assisted generation tools",
                  "Publish and sell digital products on our marketplace",
                  "Purchase and download digital products created by sellers",
                  "Access AI tools for content creation, cover design, and product development",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#e85d26] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">3. User Accounts</h2>
              <p>
                To access certain features, you must create an account. You are responsible for:
              </p>
              <ul className="list-none space-y-2 mt-3">
                {[
                  "Maintaining the confidentiality of your account credentials",
                  "All activity that occurs under your account",
                  "Providing accurate and current information during registration",
                  "Notifying us immediately of any unauthorized use of your account",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#e85d26] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                We reserve the right to suspend or terminate accounts that violate these terms.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">4. Seller Terms</h2>
              <p>As a seller on PDF's To Go, you agree to:</p>
              <ul className="list-none space-y-2 mt-3">
                {[
                  "Only publish content that you own or have the legal right to distribute",
                  "Ensure your products are accurately described and meet reasonable quality standards",
                  "Not publish content that is illegal, harmful, defamatory, or infringes on third-party rights",
                  "Take full responsibility for the accuracy of AI-generated content you publish and sell",
                  "Not use the platform to sell plagiarized, misleading, or fraudulent products",
                  "Comply with all applicable laws and regulations in your jurisdiction",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#e85d26] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                <strong className="text-white">AI-Generated Content:</strong> Content created through our AI tools is provided as a starting point. Sellers are solely responsible for reviewing, editing, and verifying all AI-generated content before publishing. Into All The World Digital Products makes no representations about the accuracy, completeness, or fitness for any purpose of AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">5. Buyer Terms</h2>
              <p>As a buyer, you agree that:</p>
              <ul className="list-none space-y-2 mt-3">
                {[
                  "All purchases are for personal use or as permitted by the seller's license",
                  "Digital products are non-refundable once downloaded, unless the product is materially different from its description",
                  "You will not redistribute, resell, or share purchased content without authorization",
                  "You understand that products may contain AI-generated content",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#e85d26] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">6. Payments & Fees</h2>
              <p>
                Payments are processed securely through Stripe. By making a purchase, you agree to Stripe's terms of service. All prices are listed in USD unless otherwise stated.
              </p>
              <p className="mt-3">
                Into All The World Digital Products reserves the right to change pricing or introduce platform fees with reasonable notice. Sellers are responsible for any applicable taxes on their sales.
              </p>
              <p className="mt-3">
                <strong className="text-white">Refund Policy:</strong> Due to the digital nature of our products, all sales are final. Refunds may be issued at our sole discretion in cases of technical failure preventing download, or where a product is materially misrepresented.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">7. Intellectual Property</h2>
              <p>
                Users retain ownership of original content they create and publish on the platform. By publishing content, you grant Into All The World Digital Products a non-exclusive license to display, promote, and distribute your content on the platform.
              </p>
              <p className="mt-3">
                The PDF's To Go platform, including its AI tools, design, and infrastructure, is the intellectual property of Into All The World Digital Products. You may not copy, reproduce, or create derivative works from our platform without express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">8. AI Tools & Content Policy</h2>
              <p>
                Our platform uses artificial intelligence to assist with content creation. You acknowledge that:
              </p>
              <ul className="list-none space-y-2 mt-3">
                {[
                  "AI-generated content may not always be accurate, original, or appropriate",
                  "You are responsible for reviewing all AI-generated content before use",
                  "We do not guarantee that AI-generated content is free from third-party intellectual property claims",
                  "AI tools may be modified, updated, or discontinued at any time",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#e85d26] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">9. Prohibited Conduct</h2>
              <p>You may not use PDF's To Go to:</p>
              <ul className="list-none space-y-2 mt-3">
                {[
                  "Violate any applicable law or regulation",
                  "Publish or distribute illegal, harmful, or offensive content",
                  "Infringe on any third party's intellectual property or privacy rights",
                  "Engage in fraud, deception, or misrepresentation",
                  "Attempt to hack, disrupt, or gain unauthorized access to the platform",
                  "Use automated scripts to scrape, copy, or abuse platform resources",
                  "Create multiple accounts to circumvent restrictions or bans",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#e85d26] mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">10. Disclaimer of Warranties</h2>
              <p>
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. INTO ALL THE WORLD DIGITAL PRODUCTS DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">11. Limitation of Liability</h2>
              <p>
                TO THE FULLEST EXTENT PERMITTED BY LAW, INTO ALL THE WORLD DIGITAL PRODUCTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM OR PURCHASE OF DIGITAL PRODUCTS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="mt-3">
                Our total liability to you for any claim shall not exceed the amount you paid to us in the three months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">12. Privacy</h2>
              <p>
                Your use of the platform is subject to our Privacy Policy. By using PDF's To Go, you consent to the collection and use of your information as described therein. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">13. Modifications</h2>
              <p>
                Into All The World Digital Products reserves the right to modify these Terms at any time. We will notify users of material changes via email or a prominent notice on the platform. Continued use after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">14. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration or in the courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-white font-bold text-xl mb-4">15. Contact</h2>
              <p>
                For questions about these Terms of Service, please contact:
              </p>
              <div className="mt-3 bg-[#161616] border border-[#2a2a2a] p-5 inline-block">
                <p className="text-white font-semibold">Into All The World Digital Products</p>
                <p className="text-[#a09890] text-sm mt-1">via the PDF's To Go platform</p>
              </div>
            </section>
          </div>

          {/* Footer nav */}
          <div className="mt-16 pt-8 border-t border-[#2a2a2a] flex gap-6">
            <Link href="/" className="text-sm text-[#a09890] hover:text-white transition-colors">← Home</Link>
            <Link href="/store" className="text-sm text-[#a09890] hover:text-white transition-colors">Store</Link>
            <Link href="/sign-up" className="text-sm text-[#e85d26] hover:underline">Get Started</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
