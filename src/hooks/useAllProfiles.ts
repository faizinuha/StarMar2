import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllProfiles() {
    return useQuery({
        queryKey: ["allProfiles"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*");
            if (error) throw error;
            return data;
        },
    });
}
