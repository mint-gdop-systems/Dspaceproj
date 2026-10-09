import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import dspaceService from "@/services/dspaceService";

export function useSubmitAuthorization() {
	const { user } = useAuth();
	const [canSubmit, setCanSubmit] = useState(false);

	useEffect(() => {
		if (!user) {
			setCanSubmit(false);
			return undefined;
		}

		let cancelled = false;
		dspaceService.getSubmitAuthorizedCollections(0, 1).then((result) => {
			if (!cancelled) {
				setCanSubmit(result.collections.length > 0);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [user]);

	return canSubmit;
}
