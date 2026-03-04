import { ThirdwebProvider } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";

// Normally you would feed this from .env
const client = createThirdwebClient({
    clientId: "b80fbbad9e9de04bc04c4af4eebdc0cb", // Hackathon specific temporary ID
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThirdwebProvider>
            {children}
        </ThirdwebProvider>
    );
}
