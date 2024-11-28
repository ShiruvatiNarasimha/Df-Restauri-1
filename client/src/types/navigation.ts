export interface NavigationSubItem {
  id: string;
  label: string;
  href: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  children?: NavigationSubItem[];
}
