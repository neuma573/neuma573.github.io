const monthIndex = (value) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
        throw new Error(`Invalid career month: ${value}`);
    }
    const [year, month] = value.split('-').map(Number);
    return year * 12 + month - 1;
};

// Count listed calendar months once, including both ends of each period.
export function countCareerMonths(periods, asOfMonth) {
    const current = monthIndex(asOfMonth);
    const ranges = periods.map(({ start, end }) => {
        const from = monthIndex(start);
        const to = end ? monthIndex(end) : current;
        if (end && to < from) throw new Error('Career end precedes start');
        return [from, Math.min(to, current) + 1];
    }).filter(([from, until]) => from < until).sort((a, b) => a[0] - b[0]);

    const merged = [];
    for (const [from, until] of ranges) {
        const last = merged.at(-1);
        if (last && from <= last[1]) last[1] = Math.max(last[1], until);
        else merged.push([from, until]);
    }
    return merged.reduce((total, [from, until]) => total + until - from, 0);
}

export function getCareerSummary(periods, asOfMonth) {
    const total = countCareerMonths(periods.filter(period => period.total !== false), asOfMonth);
    const kosa = countCareerMonths(periods.filter(period => period.kosa), asOfMonth);
    const duration = months => `${Math.floor(months / 12)}년 ${months % 12}개월`;
    return { total: duration(total), kosa: duration(kosa), year: Math.floor(total / 12) + 1 };
}

export function getCareerMonth(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit'
    }).formatToParts(now);
    return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
}

function renderCareerSummary() {
    const asOfMonth = getCareerMonth();
    const periods = [...document.querySelectorAll('.career-table tbody tr')].map(row => ({
        start: row.dataset.start,
        end: row.dataset.end || null,
        kosa: row.dataset.kosa === 'true',
        total: row.dataset.total !== 'false'
    }));
    const summary = getCareerSummary(periods, asOfMonth);
    document.getElementById('career-total').textContent = `만 ${summary.total}`;
    document.getElementById('career-kosa').textContent = `(KOSA ${summary.kosa})`;
    document.getElementById('career-year').textContent = `${summary.year}년차`;
    const date = document.getElementById('career-as-of');
    date.dateTime = asOfMonth;
    date.textContent = asOfMonth.replace('-', '.');
}

if (typeof document !== 'undefined') {
    renderCareerSummary();
    window.addEventListener('beforeprint', renderCareerSummary);
    window.addEventListener('pageshow', renderCareerSummary);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) renderCareerSummary();
    });
    // Refresh an open page across month boundaries; returning tabs update immediately.
    window.setInterval(() => {
        if (!document.hidden) renderCareerSummary();
    }, 60_000);
}
