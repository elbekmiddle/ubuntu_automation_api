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
    created_at: Date;
    updated_at: Date;
}