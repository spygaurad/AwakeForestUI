import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Map,
  Layers,
  Cpu,
  Activity,
  Bell,
  ArrowRight,
  TreePine,
  Satellite,
  BarChart3,
} from 'lucide-react';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50/30">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-primary-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-3">
              <img
                src="/AwakeForest_logo.png"
                alt="AwakeForest"
                className="h-8 w-auto object-contain"
              />
              <div className="leading-tight">
                <span className="text-lg font-bold text-primary-600">AwakeForest</span>
                <p className="text-[10px] text-gray-500 leading-none">Forest Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="px-4 py-1.5 text-sm font-medium text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium mb-6">
          <TreePine className="w-3 h-3" />
          Geospatial Intelligence for Forest Management
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-5 leading-tight">
          Monitor. Annotate.{' '}
          <span className="text-primary-600">Protect.</span>
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          AwakeForest is a unified platform for geospatial data management, AI-powered inference,
          and real-time forest monitoring at scale.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary-700 border border-primary-200 rounded-xl hover:bg-primary-50 transition-colors"
          >
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 border border-primary-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary-100 py-6 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} AwakeForest. All rights reserved.
      </footer>
    </div>
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
