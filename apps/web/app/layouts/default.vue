<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const open = ref(false);
const collapsed = ref(false);

// Main navigation links
const links = [
    [
        {
            label: "Dashboard",
            icon: "i-lucide-layout-dashboard",
            to: "/dashboard",
            onSelect: () => {
                open.value = false;
            },
        },
        {
            label: "Companies",
            icon: "i-lucide-building-2",
            to: "/companies",
            onSelect: () => {
                open.value = false;
            },
        },
        {
            label: "Electric SQL",
            icon: "i-lucide-zap",
            to: "/electric-test",
            onSelect: () => {
                open.value = false;
            },
        },
    ],
    [
        {
            label: "Documentation",
            icon: "i-lucide-book-open",
            to: "https://github.com/nuxt-ui-templates/dashboard",
            target: "_blank",
        },
    ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
    {
        id: "links",
        label: "Go to",
        items: links.flat(),
    },
]);
</script>

<template>
    <UDashboardGroup unit="rem">
        <UDashboardSidebar
            id="default"
            v-model:open="open"
            v-model:collapsed="collapsed"
            collapsible
            resizable
            class="bg-elevated/25"
            :ui="{ footer: 'lg:border-t lg:border-default' }"
        >
            <template #header>
                <CompanySwitcher :collapsed="collapsed" />
            </template>

            <template #default>
                <UDashboardSearchButton
                    :collapsed="collapsed"
                    class="bg-transparent ring-default"
                />

                <UNavigationMenu
                    :collapsed="collapsed"
                    :items="links[0]"
                    orientation="vertical"
                    tooltip
                    popover
                />

                <UNavigationMenu
                    :collapsed="collapsed"
                    :items="links[1]"
                    orientation="vertical"
                    tooltip
                    class="mt-auto"
                />
            </template>

            <template #footer>
                <UserMenu :collapsed="collapsed" />
            </template>
        </UDashboardSidebar>

        <UDashboardSearch :groups="groups" />

        <slot />

        <NotificationsSlideover />
    </UDashboardGroup>
</template>
