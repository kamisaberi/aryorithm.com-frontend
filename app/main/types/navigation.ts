export interface NavItem {
  name: string;
  desc: string;
  to: string;
  section?: string;
}

export interface NavGroup {
  label: string;
  match?: string[];
  to?: string;
  section?: string;
  items?: NavItem[];
}

export interface FooterLink {
  label: string;
  to: string;
  section?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface BreadcrumbStep {
  label: string;
  to?: string;
  section?: string;
}
