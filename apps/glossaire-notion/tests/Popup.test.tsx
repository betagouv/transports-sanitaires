import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popup } from "../src/popup/Popup";
import type { CachedGlossary } from "../src/storage";

const { getOrFetchGlossary } = vi.hoisted(() => ({
  getOrFetchGlossary: vi.fn<(options?: { forceRefresh?: boolean }) => Promise<CachedGlossary>>(),
}));
vi.mock("../src/storage", () => ({ getOrFetchGlossary }));

const cache: CachedGlossary = {
  fetchedAt: Date.UTC(2026, 5, 24, 10, 0, 0),
  entries: [
    { id: "1", terme: "ALD", definition: "Affection de Longue Durée", categorie: "Réglementation" },
    { id: "2", terme: "Ambulance", definition: "Transport adapté pour patient allongé" },
    {
      id: "3",
      terme: "CABDDGOS",
      definition: "Cabinet de la DDGOS",
      structureParente: "DDGOS",
    },
  ],
};

beforeEach(() => {
  getOrFetchGlossary.mockReset();
  getOrFetchGlossary.mockResolvedValue(cache);
});

describe("Popup", () => {
  it("focuses the search input on mount", () => {
    render(<Popup />);

    expect(screen.getByPlaceholderText(/rechercher/i)).toHaveFocus();
  });

  it("shows a loading message then the glossary entries", async () => {
    render(<Popup />);

    expect(screen.getByText(/chargement/i)).toBeInTheDocument();

    expect(await screen.findByText("ALD")).toBeInTheDocument();
    expect(screen.getByText("Ambulance")).toBeInTheDocument();
  });

  it("shows the structure parente when an entry has one", async () => {
    render(<Popup />);

    expect(await screen.findByText("CABDDGOS")).toBeInTheDocument();
    expect(screen.getByText(/structure parente : ddgos/i)).toBeInTheDocument();
  });

  it("filters entries as the user types in the search field", async () => {
    render(<Popup />);
    await screen.findByText("ALD");

    await userEvent.type(screen.getByPlaceholderText(/rechercher/i), "ambulance");

    expect(screen.queryByText("ALD")).not.toBeInTheDocument();
    expect(screen.getByText("Ambulance")).toBeInTheDocument();
  });

  it("offers to add the missing term in Notion when the search has no match", async () => {
    render(<Popup />);
    await screen.findByText("ALD");

    await userEvent.type(screen.getByPlaceholderText(/rechercher/i), "inexistant");

    expect(screen.getByText(/aucun résultat pour « inexistant »/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /ajouter ce terme dans notion/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("notion.com"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows an error message with a retry button when fetching fails", async () => {
    getOrFetchGlossary.mockRejectedValueOnce(new Error("network down"));
    render(<Popup />);

    expect(await screen.findByText(/impossible de charger/i)).toBeInTheDocument();

    getOrFetchGlossary.mockResolvedValueOnce(cache);
    await userEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    expect(await screen.findByText("ALD")).toBeInTheDocument();
  });

  it("forces a refresh when the refresh button is clicked", async () => {
    render(<Popup />);
    await screen.findByText("ALD");

    await userEvent.click(screen.getByRole("button", { name: /actualiser/i }));

    await waitFor(() => {
      expect(getOrFetchGlossary).toHaveBeenLastCalledWith({ forceRefresh: true });
    });
  });
});
