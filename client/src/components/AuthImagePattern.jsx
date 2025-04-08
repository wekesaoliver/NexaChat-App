const AuthImagePattern = ({ title, subtitle }) => {
    return (
        <div className="hidden lg:flex items-center justify-center bg-base-200 p-6 md:p-8 lg:p-12">
            <div className="max-w-md text-center">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 lg:mb-8">
                    {[...Array(9)].map((_, i) => (
                        <div
                            key={i}
                            className={`aspect-square rounded-xl sm:rounded-2xl bg-primary/10 ${
                                i % 2 === 0 ? "animate-pulse" : ""
                            }`}
                        />
                    ))}
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">
                    {title}
                </h2>
                <p className="text-sm md:text-base text-base-content/60">
                    {subtitle}
                </p>
            </div>
        </div>
    );
};

export default AuthImagePattern;
