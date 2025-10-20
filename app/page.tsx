'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import '@/lib/i18n';
import LanguageSelector from '@/components/LanguageSelector';
import AuthButton from '@/components/AuthButton';

export default function HomePage() {
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'ko';
    i18n.changeLanguage(savedLang);
  }, [i18n]);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold text-white">KOCO</div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-koco-primary to-koco-secondary text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              {t('title')}
              <span className="block text-3xl mt-4 text-blue-200">{t('subtitle')}</span>
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              {t('hero.description')}
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard" className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl inline-block">
                {t('hero.startButton')}
              </Link>
              <Link href="#features" className="bg-transparent hover:bg-white/10 text-white border-2 border-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 inline-block">
                {t('hero.learnMore')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            {t('features.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card">
              <div className="w-16 h-16 bg-koco-primary rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-gray-800">{t('features.psa.title')}</h3>
              <p className="text-gray-600">
                {t('features.psa.description')}
              </p>
            </div>

            <div className="card">
              <div className="w-16 h-16 bg-koco-primary rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-gray-800">{t('features.pso.title')}</h3>
              <p className="text-gray-600">
                {t('features.pso.description')}
              </p>
            </div>

            <div className="card">
              <div className="w-16 h-16 bg-koco-primary rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-gray-800">{t('features.report.title')}</h3>
              <p className="text-gray-600">
                {t('features.report.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            {t('process.title')}
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center flex-1">
                <div className="w-20 h-20 bg-koco-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('process.step1.title')}</h3>
                <p className="text-gray-600">{t('process.step1.description')}</p>
              </div>

              <div className="hidden md:block text-4xl text-koco-primary">→</div>

              <div className="text-center flex-1">
                <div className="w-20 h-20 bg-koco-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('process.step2.title')}</h3>
                <p className="text-gray-600">{t('process.step2.description')}</p>
              </div>

              <div className="hidden md:block text-4xl text-koco-primary">→</div>

              <div className="text-center flex-1">
                <div className="w-20 h-20 bg-koco-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('process.step3.title')}</h3>
                <p className="text-gray-600">{t('process.step3.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-koco-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
          <Link href="/signup" className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl inline-block">
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </main>
  );
}