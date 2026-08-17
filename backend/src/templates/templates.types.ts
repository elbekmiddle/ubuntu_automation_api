export interface TemplateManifest {
    slug: string;
    name: string;
    description?: string;
    actions: string[];
}

export interface Template {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    path: string;
    actions: string[];
    owner_id: string | null;
    is_public: boolean;
    current_version?: number;
    created_at: Date;
    updated_at: Date;
}