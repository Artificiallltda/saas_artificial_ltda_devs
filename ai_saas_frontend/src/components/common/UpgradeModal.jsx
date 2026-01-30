import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const getFeatureDisplayName = (feature, t) => {
  const featureNames = {
    'text_generation': t('upgrade_modal.feature_names.text_generation'),
    'image_generation': t('upgrade_modal.feature_names.image_generation'),
    'video_generation': t('upgrade_modal.feature_names.video_generation'),
    'audio_generation': t('upgrade_modal.feature_names.audio_generation'),
    'file_attachments': t('upgrade_modal.feature_names.file_attachments'),
    'advanced_models': t('upgrade_modal.feature_names.advanced_models'),
    'custom_temperature': t('upgrade_modal.feature_names.custom_temperature'),
    'high_resolution': t('upgrade_modal.feature_names.high_resolution')
  };
  return featureNames[feature] || feature;
};

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  feature 
}) {
  const { t } = useLanguage();
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all scale-100 opacity-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          title="Fechar"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            {title}
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 mb-4 text-sm leading-relaxed">
            {description}
          </p>

          {/* Feature Highlight */}
          {feature && (
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 mb-4">
              <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-medium text-blue-900">
                {t('upgrade_modal.blocked_option')}: {getFeatureDisplayName(feature, t)}
              </span>
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                <Sparkles className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-xs text-gray-700">{t('upgrade_modal.benefits.all_features')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                <Sparkles className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-xs text-gray-700">{t('upgrade_modal.benefits.priority_support')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                <Sparkles className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-xs text-gray-700">{t('upgrade_modal.benefits.higher_limits')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                // Redirecionar para página de assinatura
                window.location.href = '/subscription';
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg text-sm"
            >
              <Crown className="w-4 h-4" />
              {t('upgrade_modal.upgrade_button')}
              <ArrowRight className="w-3 h-3" />
            </button>
            
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              {t('upgrade_modal.not_now_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
