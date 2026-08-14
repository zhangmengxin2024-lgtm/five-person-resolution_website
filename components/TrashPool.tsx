import React from 'react';

interface RejectedItem {
    id: string;
    faceId: string;
    feature: string;
    featureName: string;
    imageData: string;
}

interface TrashPoolProps {
    items: RejectedItem[];
}

const TrashPool: React.FC<TrashPoolProps> = ({ items }) => {
    if (items.length === 0) {
        return (
            <div className="w-36 md:w-40 border border-dashed border-[#ff3366]/30 bg-[#ff3366]/5 p-2 flex flex-col items-center justify-center">
                <div className="text-[8px] text-[#ff3366]/50 uppercase tracking-wider text-center">
                    REJECTED<br />COMPONENTS<br />POOL
                </div>
            </div>
        );
    }

    return (
        <div className="w-36 md:w-40 border border-[#ff3366]/30 bg-black/40 p-1 flex flex-col gap-1 overflow-y-auto max-h-full">
            <div className="text-[8px] text-[#ff3366] uppercase tracking-wider font-bold mb-1 text-center">
                REJECTED [{items.length}]
            </div>

            {items.slice(-12).map((item, index) => (
                <div
                    key={item.id}
                    className="trash-item h-16 relative overflow-hidden bg-black"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <img
                        src={item.imageData}
                        alt={`Rejected ${item.featureName}`}
                        className="w-full h-full object-cover opacity-70 grayscale"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

                    {/* Labels */}
                    <div className="absolute bottom-0 left-0 right-0 p-0.5">
                        <div className="rejected-label inline-block">
                            {item.featureName.slice(0, 10)}
                        </div>
                    </div>

                    {/* Face ID */}
                    <div className="absolute top-0 right-0 text-[6px] text-[#ff3366]/60 p-0.5">
                        {item.faceId.slice(-3)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TrashPool;
