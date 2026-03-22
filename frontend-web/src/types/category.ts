export interface Category {
  id: number;
  name: string;
  slug: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CategoryMinimal {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export interface CategoryCreate {
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
}
