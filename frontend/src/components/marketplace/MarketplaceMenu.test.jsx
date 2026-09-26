import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SideMenu from "../layout/SideMenu";

jest.mock("../../hooks/useAuth", () => () => ({
  handleSendEmailVerification: jest.fn(),
  loading: false,
  error: null,
}));

describe("Marketplace navigation", () => {
  it("opens the marketplace from the side menu", () => {
    const onClose = jest.fn();
    const onNavigate = jest.fn();

    render(
      <SideMenu
        availableRoles={[]}
        currentUser={null}
        isOpen
        notifications={[]}
        onClose={onClose}
        onLogout={jest.fn()}
        onNavigate={onNavigate}
        t={(key) => key}
      />,
    );

    fireEvent.click(screen.getByTestId("marketplace-menu-btn"));

    expect(onNavigate).toHaveBeenCalledWith("marketplace");
    expect(onClose).toHaveBeenCalled();
  });
});
