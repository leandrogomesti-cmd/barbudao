
// Mission Type Configuration based on tipo_missao_enum
export const MISSION_TYPE_CONFIG: Record<string, { label: string; requiresPhoto: boolean; requiresValue?: boolean; icon?: any }> = {
    "Financeiro": {
        label: "Financeiro",
        requiresPhoto: true,
        requiresValue: true
    },
    "Auditoria": {
        label: "Auditoria",
        requiresPhoto: true
    },
    "Operacional": {
        label: "Operacional",
        requiresPhoto: true
    },
    "Marketing": {
        label: "Marketing",
        requiresPhoto: false
    },
    "Outros": {
        label: "Outros",
        requiresPhoto: false
    }
};

// Legacy export for backward compatibility (deprecated)
export const CAMPAIGN_DICTIONARY = MISSION_TYPE_CONFIG;

