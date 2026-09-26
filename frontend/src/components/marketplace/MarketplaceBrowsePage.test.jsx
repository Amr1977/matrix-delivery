import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarketplaceBrowsePage from "./MarketplaceBrowsePage";
import { ApiClient } from "../../services/api";

jest.mock("../../i18n/i18nContext", () => {
  const translate = (key) => key;
  return {
    useI18n: () => ({ t: translate, locale: "en" }),
  };
});

jest.mock("../../services/api", () => ({
  ApiClient: { get: jest.fn() },
}));

describe("MarketplaceBrowsePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("searches nearby stores and displays address and distance", async () => {
    ApiClient.get.mockResolvedValue({
      count: 1,
      items: [
        {
          id: "store-1",
          name: "Green Market",
          address: "12 Market Lane",
          distance_m: 1850,
        },
      ],
    });

    render(<MarketplaceBrowsePage />);
    fireEvent.change(screen.getByLabelText("common.lat"), {
      target: { value: "30.0444" },
    });
    fireEvent.change(screen.getByLabelText("common.lng"), {
      target: { value: "31.2357" },
    });
    fireEvent.click(screen.getByRole("button", { name: "marketplace.findStores" }));

    expect(await screen.findByText("Green Market")).toBeInTheDocument();
    expect(screen.getByText("12 Market Lane")).toBeInTheDocument();
    expect(screen.getByText("1.9 km")).toBeInTheDocument();
    expect(ApiClient.get).toHaveBeenCalledWith(
      "/browse/vendors-near?lat=30.0444&lng=31.2357&radius_km=5&page=1&limit=20",
    );
  });

  it("rejects invalid coordinates without calling the API", () => {
    render(<MarketplaceBrowsePage />);
    fireEvent.change(screen.getByLabelText("common.lat"), {
      target: { value: "91" },
    });
    fireEvent.change(screen.getByLabelText("common.lng"), {
      target: { value: "31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "marketplace.findStores" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "marketplace.invalidCoordinates",
    );
    expect(ApiClient.get).not.toHaveBeenCalled();
  });

  it("shows a useful empty state when no stores match", async () => {
    ApiClient.get.mockResolvedValue({ count: 0, items: [] });

    render(<MarketplaceBrowsePage />);
    fireEvent.change(screen.getByLabelText("common.lat"), {
      target: { value: "30.0444" },
    });
    fireEvent.change(screen.getByLabelText("common.lng"), {
      target: { value: "31.2357" },
    });
    fireEvent.click(screen.getByRole("button", { name: "marketplace.findStores" }));

    expect(await screen.findByText("marketplace.emptyTitle")).toBeInTheDocument();
    expect(screen.getByText("marketplace.emptyHint")).toBeInTheDocument();
  });
});
