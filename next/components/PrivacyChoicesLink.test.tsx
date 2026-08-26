import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyChoicesLink from "./PrivacyChoicesLink";

describe("PrivacyChoicesLink", () => {
    afterEach(() => {
        cleanup();
        delete window._iub;
    });

    it("opens the Iubenda preferences panel", () => {
        const openPreferences = vi.fn();
        window._iub = { cs: { api: { openPreferences } } };

        render(<PrivacyChoicesLink />);
        fireEvent.click(
            screen.getByRole("button", { name: "Your Privacy Choices" }),
        );

        expect(openPreferences).toHaveBeenCalledOnce();
    });

    it("does not fail before Iubenda is available", () => {
        render(<PrivacyChoicesLink />);

        expect(() =>
            fireEvent.click(
                screen.getByRole("button", {
                    name: "Your Privacy Choices",
                }),
            ),
        ).not.toThrow();
    });
});
