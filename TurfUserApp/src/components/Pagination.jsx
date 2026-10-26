import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

// Compact numbered pagination: ‹ 1 2 3 … 8 ›
export default function Pagination({ page, totalPages, onChange, theme }) {
    if (!totalPages || totalPages <= 1) return null;
    const t = {
        primary: theme?.primary || '#0F766E',
        card: theme?.card || '#FFFFFF',
        border: theme?.border || '#E5EAF0',
        text: theme?.text || '#0F172A',
        subtext: theme?.subtext || '#64748B',
    };

    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
        else if (pages[pages.length - 1] !== '…') pages.push('…');
    }

    const arrow = (dir, disabled) => (
        <TouchableOpacity
            disabled={disabled}
            onPress={() => onChange(page + dir)}
            style={[styles.box, { backgroundColor: t.card, borderColor: t.border, opacity: disabled ? 0.4 : 1 }]}
        >
            <Feather name={dir < 0 ? 'chevron-left' : 'chevron-right'} size={16} color={t.text} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.wrap}>
            {arrow(-1, page <= 1)}
            {pages.map((p, idx) =>
                p === '…' ? (
                    <Text key={`dots_${idx}`} style={{ color: t.subtext, paddingHorizontal: 2 }}>…</Text>
                ) : (
                    <TouchableOpacity
                        key={`pg_${p}`}
                        onPress={() => onChange(p)}
                        style={[
                            styles.box,
                            p === page
                                ? { backgroundColor: t.primary, borderColor: t.primary }
                                : { backgroundColor: t.card, borderColor: t.border },
                        ]}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: p === page ? '#FFFFFF' : t.text }}>{p}</Text>
                    </TouchableOpacity>
                )
            )}
            {arrow(1, page >= totalPages)}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
    box: { minWidth: 34, height: 34, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
