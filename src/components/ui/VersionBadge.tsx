import { APP_VERSION } from '../../shared/version';

export function VersionBadge() {
  return (
    <div
      className="fixed bottom-2 right-2 text-xs opacity-50"
      style={{ fontFamily: 'Georgia, serif', color: '#8b5a2b' }}
    >
      v{APP_VERSION}
    </div>
  );
}
