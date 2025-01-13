import { useQuery } from "@tanstack/react-query";

export interface ContentSection {
  title: string;
  content: string;
  items?: string[];
  points?: string[];
}

export interface AboutContent {
  storia: ContentSection;
  valori: ContentSection;
  mission: ContentSection;
