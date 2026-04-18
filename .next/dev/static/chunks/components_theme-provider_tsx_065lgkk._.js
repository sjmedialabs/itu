(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/theme-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const THEMES = [
    'light',
    'dark',
    'system'
];
const ThemeContext = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](null);
function normalizeStored(raw, defaultTheme, enableSystem) {
    if (raw === 'dark' || raw === 'light') return raw;
    if (raw === 'system') return enableSystem ? 'system' : 'light';
    if (defaultTheme === 'dark' || defaultTheme === 'light') return defaultTheme;
    if (defaultTheme === 'system' && enableSystem) return 'system';
    return 'light';
}
function readSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function resolveLightDark(theme, enableSystem, systemTheme) {
    if (theme === 'system' && enableSystem) {
        return systemTheme ?? readSystemTheme();
    }
    return theme === 'dark' ? 'dark' : 'light';
}
function ThemeProvider({ children, attribute: _attribute = 'class', defaultTheme = 'light', enableSystem = false, disableTransitionOnChange: _disableTransitionOnChange = false, storageKey = 'theme' }) {
    _s();
    const [theme, setThemeState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "ThemeProvider.useState": ()=>normalizeStored(null, defaultTheme, enableSystem)
    }["ThemeProvider.useState"]);
    const [systemTheme, setSystemTheme] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](undefined);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "ThemeProvider.useEffect": ()=>{
            const stored = window.localStorage.getItem(storageKey);
            setThemeState(normalizeStored(stored, defaultTheme, enableSystem));
            setSystemTheme(readSystemTheme());
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const onPrefChange = {
                "ThemeProvider.useEffect.onPrefChange": ()=>setSystemTheme(mq.matches ? 'dark' : 'light')
            }["ThemeProvider.useEffect.onPrefChange"];
            mq.addEventListener('change', onPrefChange);
            return ({
                "ThemeProvider.useEffect": ()=>mq.removeEventListener('change', onPrefChange)
            })["ThemeProvider.useEffect"];
        }
    }["ThemeProvider.useEffect"], [
        defaultTheme,
        enableSystem,
        storageKey
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "ThemeProvider.useEffect": ()=>{
            const resolved = resolveLightDark(theme, enableSystem, systemTheme);
            const root = document.documentElement;
            root.classList.toggle('dark', resolved === 'dark');
            root.style.colorScheme = resolved;
        }
    }["ThemeProvider.useEffect"], [
        theme,
        systemTheme,
        enableSystem
    ]);
    const setTheme = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "ThemeProvider.useCallback[setTheme]": (value)=>{
            const next = value === 'light' || value === 'dark' ? value : value === 'system' && enableSystem ? 'system' : normalizeStored(null, defaultTheme, enableSystem);
            setThemeState(next);
            try {
                window.localStorage.setItem(storageKey, next);
            } catch  {
            /* ignore */ }
        }
    }["ThemeProvider.useCallback[setTheme]"], [
        defaultTheme,
        enableSystem,
        storageKey
    ]);
    const resolvedTheme = resolveLightDark(theme, enableSystem, systemTheme);
    const value = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "ThemeProvider.useMemo[value]": ()=>({
                theme,
                setTheme,
                resolvedTheme,
                systemTheme,
                themes: [
                    ...THEMES
                ]
            })
    }["ThemeProvider.useMemo[value]"], [
        theme,
        setTheme,
        resolvedTheme,
        systemTheme
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/theme-provider.tsx",
        lineNumber: 116,
        columnNumber: 10
    }, this);
}
_s(ThemeProvider, "9ssQ2D0OPV56yyibx06lPuPIfQQ=");
_c = ThemeProvider;
function useTheme() {
    _s1();
    const ctx = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
_s1(useTheme, "/dMy7t63NXD4eYACoT93CePwGrg=");
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_theme-provider_tsx_065lgkk._.js.map