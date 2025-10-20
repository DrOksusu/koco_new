import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import koCommon from '@/public/locales/ko/common.json';
import enCommon from '@/public/locales/en/common.json';
import zhCommon from '@/public/locales/zh/common.json';
import jaCommon from '@/public/locales/ja/common.json';

const resources = {
  ko: {
    common: koCommon,
  },
  en: {
    common: enCommon,
  },
  zh: {
    common: zhCommon,
  },
  ja: {
    common: jaCommon,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko',
    fallbackLng: 'ko',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;