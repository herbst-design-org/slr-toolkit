export const subtractList = <T>(params: { subtract: T[]; from: T[] }): T[] => {
    const { subtract, from } = params;

    const dict = new Map<T, boolean>(); // Using Map for generic keys

    // Populate the map with items to subtract
    subtract.forEach(item => dict.set(item, true));

    // Filter out items present in the dictionary
    return from.reduce<T[]>((prev, current) => {
        if (!dict.has(current)) {
            prev.push(current);
        }
        return prev;
    }, []);
};
