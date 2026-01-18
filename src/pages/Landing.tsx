import { Sparkles, Zap, Target, TrendingUp, Bot, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Ideas",
      description: "Generate 5 turn-key business concepts tailored for solopreneurs and introverts",
    },
    {
      icon: Target,
      title: "$10K/Month Blueprint",
      description: "Clear revenue math and pricing strategies to reach your income goals",
    },
    {
      icon: Zap,
      title: "Fast Validation",
      description: "Get your first paying customer in 2-4 weeks with proven strategies",
    },
    {
      icon: Bot,
      title: "AI Automation",
      description: "Ready-to-use prompts for automating sales, prospecting, and client management",
    },
    {
      icon: Users,
      title: "Introvert-Friendly",
      description: "Business models that minimize cold calling and maximize relationship value",
    },
    {
      icon: TrendingUp,
      title: "Scalable Systems",
      description: "Build once, earn repeatedly without proportional time investment",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow effect */}
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
      
      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">IdeaForge</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} variant="default" className="btn-glow">
                Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate("/auth")} variant="ghost">
                  Sign In
                </Button>
                <Button onClick={() => navigate("/auth")} className="bg-gradient-primary hover:opacity-90 btn-glow">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Business Generator</span>
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Turn Your Ideas Into
              <br />
              <span className="text-gradient-primary">$10K/Month</span> Businesses
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              AI-generated business concepts designed for solopreneurs and introverts. 
              Complete with revenue math, validation paths, and automation strategies.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 glow-primary btn-glow"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Business Ideas
              </Button>
              <Button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 border-t border-border/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Launch
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From ideation to automation, IdeaForge provides the complete blueprint for your online business success.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group p-6 rounded-xl glass card-hover"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center glass rounded-2xl p-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Build Your Dream Business?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of solopreneurs who've discovered their perfect business idea with IdeaForge.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-accent text-accent-foreground hover:opacity-90 text-lg px-8 py-6 glow-accent btn-glow"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Free Today
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© 2026 IdeaForge. Built for dreamers, designed for doers.</p>
        </div>
      </footer>
    </div>
  );
}
