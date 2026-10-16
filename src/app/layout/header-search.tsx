import type { FormEventHandler, Ref } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function HeaderSearch({ value, onValueChange, onSubmit, inputRef, onClose }: SearchFieldProps & {
  inputRef: Ref<HTMLInputElement>;
  onClose: () => void;
}) {
  return (
    <form
      id="catalog-search"
      role="search"
      aria-label="Busca de NFTs"
      onSubmit={onSubmit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      className="border-t border-[#3b2922] px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-2">
        <label htmlFor="catalog-search-input" className="sr-only">Buscar NFTs pelo nome</label>
        <Input
          ref={inputRef}
          id="catalog-search-input"
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder="Buscar NFTs pelo nome"
          className="h-10 min-w-0 flex-1 rounded-sm border-primary/25 bg-card"
        />
        <Button type="submit" size="icon" aria-label="Aplicar busca" className="size-10 rounded-sm">
          <Search aria-hidden="true" className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar busca" onClick={onClose} className="size-10 rounded-sm">
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </form>
  );
}

export function HomeMobileSearch({ value, onValueChange, onSubmit, onReset, filtersOpen, onOpenFilters }: SearchFieldProps & {
  onReset: () => void;
  filtersOpen: boolean;
  onOpenFilters: () => void;
}) {
  return (
    <form role="search" aria-label="Busca mobile de NFTs" className="home-mobile-search" onSubmit={onSubmit}>
      <div className="home-mobile-search-field">
        <button type="submit" aria-label="Aplicar busca mobile"><Search aria-hidden="true" /></button>
        <label htmlFor="home-mobile-search-input" className="sr-only">Buscar NFTs pelo nome</label>
        <Input id="home-mobile-search-input" type="search" enterKeyHint="search" placeholder="Explorar coleções" value={value} onChange={(event) => onValueChange(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Escape") { onReset(); event.currentTarget.blur(); } }} />
      </div>
      <button id="home-mobile-filters" type="button" className="home-mobile-filter-button" aria-label="Abrir filtros" aria-haspopup="dialog" aria-expanded={filtersOpen} aria-controls="home-mobile-filters-panel" onClick={onOpenFilters}><SlidersHorizontal aria-hidden="true" /></button>
    </form>
  );
}
