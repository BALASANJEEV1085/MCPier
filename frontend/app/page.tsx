import { LandingNavbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { InteractiveDemo } from '@/components/landing/interactive-demo'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Features } from '@/components/landing/features'
import { ExecutionDemo } from '@/components/landing/execution-demo'
import { FinalCta } from '@/components/landing/final-cta'
import { Footer } from '@/components/landing/footer'

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <InteractiveDemo />
        <HowItWorks />
        <Features />
        <ExecutionDemo />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
