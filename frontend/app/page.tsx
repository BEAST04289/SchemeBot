import Link from "next/link";
import { MessageCircle, ArrowRight, CheckCircle2, Building, GraduationCap, Users, Briefcase, Heart, Sprout } from "lucide-react";

export default function Home() {
  const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(process.env.NEXT_PUBLIC_WHATSAPP_TEXT || "hi")}`;

  return (
    <main className="flex-grow flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 px-6 md:px-12 flex justify-between items-center shadow-sm relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-saffron flex items-center justify-center text-white font-bold text-xl">S</div>
          <h1 className="text-xl font-bold text-navy hidden md:block">Sarthi Kalyan <span className="text-gray-400 font-normal">|</span> सार्थी कल्याण</h1>
        </div>
        <nav className="flex items-center gap-4">
          <a href="#pricing" className="text-sm text-slate-600 hover:text-navy font-medium">Pricing</a>
          <Link href="/auth" className="bg-navy text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-navy-dark transition">
            Log In
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="bg-navy text-white pt-20 pb-24 px-6 md:px-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/grid.svg')] z-0"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-hindi leading-tight">
            Discover Your Government Schemes
            <br />
            <span className="text-saffron">अपनी सरकारी योजनाएं खोजें</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            AI-powered welfare discovery. Find the exact Indian central and state government schemes you are eligible for in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth" className="bg-saffron text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-saffron-dark transition flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center">
              Check Eligibility <ArrowRight className="w-5 h-5" />
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="bg-tricolorgreen text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-tricolorgreen-dark transition flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center">
              <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy mb-3">Who is this for?</h2>
            <p className="text-slate-500">We help every citizen access their rightful benefits.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <CategoryCard icon={<Sprout />} title="Farmer" />
            <CategoryCard icon={<GraduationCap />} title="Student" />
            <CategoryCard icon={<Users />} title="Woman" />
            <CategoryCard icon={<Building />} title="Business" />
            <CategoryCard icon={<Heart />} title="Senior" />
            <CategoryCard icon={<Briefcase />} title="Job Seeker" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 md:px-12 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy mb-3">Simple, Transparent Pricing</h2>
            <p className="text-slate-500">Start for free, unlock comprehensive reports when you need them.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard 
              title="Free Trial" 
              price="₹0" 
              description="Perfect for a quick eligibility check."
              features={["1 Free Match Report", "Top 5 Matched Schemes", "Basic Eligibility Verification"]} 
            />
            <PricingCard 
              title="Detailed Report" 
              price="₹99" 
              description="One-time comprehensive scheme report."
              features={["Full Scheme Database Scan", "Application Links", "Required Document List"]}
              highlighted={true}
            />
            <PricingCard 
              title="Monthly Track" 
              price="₹249" 
              description="For continuous application tracking."
              features={["Unlimited Scans", "Application Status Tracking", "Deadline Reminders on WhatsApp"]} 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark text-slate-400 py-10 px-6 md:px-12 text-center text-sm border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Sarthi Kalyan. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Built for <span className="text-white font-semibold">XPRIZE</span></span>
            <span className="text-slate-600">|</span>
            <span>Data powered by <span className="text-white font-semibold">myscheme.gov.in</span></span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function CategoryCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:shadow-md transition cursor-pointer border border-slate-100 hover:border-saffron-light group">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-navy shadow-sm mb-4 group-hover:bg-saffron group-hover:text-white transition">
        {icon}
      </div>
      <h3 className="font-semibold text-navy">{title}</h3>
    </div>
  );
}

function PricingCard({ title, price, description, features, highlighted = false }: { title: string, price: string, description: string, features: string[], highlighted?: boolean }) {
  return (
    <div className={`rounded-2xl p-8 flex flex-col h-full bg-white relative ${highlighted ? 'border-2 border-saffron shadow-xl scale-105 z-10' : 'border border-slate-200 shadow-sm'}`}>
      {highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saffron text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</div>}
      <h3 className="text-xl font-bold text-navy mb-2">{title}</h3>
      <div className="text-4xl font-extrabold text-navy mb-2">{price}</div>
      <p className="text-slate-500 text-sm mb-6 pb-6 border-b border-slate-100">{description}</p>
      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
            <CheckCircle2 className={`w-5 h-5 shrink-0 ${highlighted ? 'text-saffron' : 'text-tricolorgreen'}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/auth" className={`w-full py-3 rounded-lg text-center font-semibold transition ${highlighted ? 'bg-saffron text-white hover:bg-saffron-dark' : 'bg-slate-100 text-navy hover:bg-slate-200'}`}>
        Get Started
      </Link>
    </div>
  );
}
