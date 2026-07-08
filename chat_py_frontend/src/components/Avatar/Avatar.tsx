interface AvatarProps {
  src?: string | null;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-24 h-24 text-4xl',
};

const Avatar = ({ src, username, size = 'md', className = '' }: AvatarProps) => {
  const sizeClass = sizeMap[size];
  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  if (src) {
    return (
      <img
        src={src}
        alt={username || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover shadow-lg ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg ${className}`}
    >
      {initial}
    </div>
  );
};

export default Avatar;
