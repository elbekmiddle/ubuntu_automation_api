function levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[a.length][b.length];
}

/** Berilgan noto'g'ri buyruqqa eng yaqin ma'lum buyruqni topadi (masofa <= 3 bo'lsa). */
export function suggestCommand(input: string, known: string[]): string | null {
    let best: string | null = null;
    let bestDistance = Infinity;

    for (const candidate of known) {
        const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
        if (distance < bestDistance) {
            bestDistance = distance;
            best = candidate;
        }
    }

    return bestDistance <= 3 ? best : null;
}
