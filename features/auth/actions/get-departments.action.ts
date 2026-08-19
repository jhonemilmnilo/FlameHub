"use server";

import { prisma } from "@/lib/prisma";
import { SearchableOption } from "@/components/ui/searchable-dropdown";

/**
 * 🏛️ Server Action / DB Query: Fetch all active department types
 * Returns formatted SearchableOption array for the dropdown combobox
 */
export async function getDepartmentOptionsAction(): Promise<SearchableOption[]> {
  try {
    const departments = await prisma.departmentType.findMany({
      orderBy: { code: "asc" },
      select: {
        code: true,
        name: true,
        description: true,
      },
    });

    return departments.map((dept) => ({
      value: dept.code,
      label: dept.name,
      subLabel: dept.description || undefined,
      badge: dept.code,
    }));
  } catch (error) {
    console.error("GET_DEPARTMENT_OPTIONS_ERROR:", error);
    return [];
  }
}
