import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Map,
  Layers,
  Cpu,
  Activity,
  Bell,
  TreePine,
  Satellite,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/workspace');

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-primary-50/30">
        {/* Nav */}
        <nav
          aria-label="Main navigation"
          className="bg-white border-b border-primary-100 sticky top-0 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14 items-center">
              <div className="flex items-center gap-3">
                <Image
                  src="/AwakeForest_logo.png"
                  alt="AwakeForest"
                  width={32}
                  height={32}
                  className="h-8 w-auto object-contain"
                  priority
                />
                <div className="leading-tight">
                  <span className="text-lg font-bold text-primary">
                    AwakeForest
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    Forest Management
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="px-4 py-1.5 text-sm font-medium text-primary border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main id="main-content">
          {/* Hero */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium mb-6">
              <TreePine className="w-3 h-3" aria-hidden="true" />
              <span>Geospatial Intelligence for Forest Management</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5 leading-tight">
              Monitor. Annotate. <span className="text-primary">Protect.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              AwakeForest is a unified platform for geospatial data management,
              AI-powered inference, and real-time forest monitoring at scale.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary/20"
              >
                Start for free
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
              >
                Go to workspace
              </Link>
            </div>
          </section>

          {/* Feature Grid */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 border border-primary-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-primary-100 py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AwakeForest. All rights reserved.
        </footer>
      </div>
    </>
  );
}

const FEATURES = [
  {
    icon: Map,
    title: 'Interactive Map Explorer',
    desc: 'Visualize datasets, annotations, and tracked objects on a live geospatial map with dynamic layer controls.',
  },
  {
    icon: Satellite,
    title: 'Dataset Management',
    desc: 'Ingest, organize, and browse large geospatial datasets with direct S3 upload support for COG rasters.',
  },
  {
    icon: Layers,
    title: 'Annotation Workflows',
    desc: 'Create, review, and export polygon annotations with versioning, bulk import, and label schema management.',
  },
  {
    icon: Cpu,
    title: 'AI Model Inference',
    desc: 'Run detection and segmentation models on any dataset. Track job progress and review outputs inline.',
  },
  {
    icon: Activity,
    title: 'Change Detection & Analysis',
    desc: 'Timeseries queries and change detection analysis over multi-temporal imagery with exportable results.',
  },
  {
    icon: Bell,
    title: 'Alerts & Subscriptions',
    desc: 'Subscribe to area-of-interest alerts with configurable severity thresholds, email, and webhook delivery.',
  },
  {
    icon: BarChart3,
    title: 'Object Tracking',
    desc: 'Track objects across time with observation timelines, priority queuing, and merge conflict resolution.',
  },
  {
    icon: TreePine,
    title: 'Multi-Org Collaboration',
    desc: 'Manage members and roles per project. Isolate data per organization with fine-grained permissions.',
  },
];