import { useAppStore } from '../store/useAppStore';
import { translations } from './translations';

export const useTranslation = () => {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const toggleLanguage = useAppStore((state) => state.toggleLanguage);

  const t = (key, params = {}) => {
    if (!key) return '';
    const keys = key.split('.');
    
    // Attempt lookup in current language
    let val = translations[language];
    for (const k of keys) {
      if (val && typeof val === 'object' && val[k] !== undefined) {
        val = val[k];
      } else {
        val = undefined;
        break;
      }
    }

    // Fallback to English ('en') if not found in current language
    if (val === undefined) {
      let fb = translations['en'];
      for (const k of keys) {
        if (fb && typeof fb === 'object' && fb[k] !== undefined) {
          fb = fb[k];
        } else {
          fb = undefined;
          break;
        }
      }
      val = fb !== undefined ? fb : key;
    }

    if (typeof val !== 'string') {
      return val ?? key;
    }

    // Parameter interpolation: {count}, {name}, etc.
    let result = val;
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      result = result.replaceAll(`{${paramKey}}`, String(paramVal));
    });

    return result;
  };

  return {
    t,
    language,
    setLanguage,
    toggleLanguage,
    isEn: language === 'en',
    isId: language === 'id',
  };
};

