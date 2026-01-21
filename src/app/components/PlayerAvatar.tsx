import React from 'react';

interface PlayerAvatarProps {
    avatar: {
        characterId?: string;
        characterName?: string;
        imageUrl: string;
    } | any;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
    className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ avatar, size = 'md', className = '' }) => {
    const sizeClasses = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
        '2xl': 'w-32 h-32',
    };

    const isNumericSize = typeof size === 'number';
    const finalSizeClass = isNumericSize ? '' : sizeClasses[size as keyof typeof sizeClasses];
    const finalStyle: React.CSSProperties = isNumericSize ? { width: size, height: size } : {};

    // Fallback para avatares antiguos que puedan tener el formato viejo
    const imageUrl = avatar?.imageUrl || '/avatars/banana-resbalon.png';

    return (
        <div
            className={`rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 relative overflow-hidden bg-white/10 ${finalSizeClass} ${className}`}
            style={finalStyle}
        >
            <img
                src={imageUrl}
                alt={avatar?.characterName || 'Avatar'}
                className="w-full h-full object-cover"
                style={{
                    objectPosition: 'center',
                }}
                onError={(e) => {
                    // Fallback si la imagen falla
                    (e.target as HTMLImageElement).src = '/avatars/banana-resbalon.png';
                }}
            />
        </div>
    );
};
