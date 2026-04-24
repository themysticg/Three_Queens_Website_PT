/**
 * Re-exports the single CONFIG SITE file so existing imports still work.
 * All changeable text lives in config-site.ts – edit that file only.
 */
export {
  appConfig,
  type DmStatusTemplate,
  type DmApplicationTemplate,
  type StaffQuestion,
  type WhitelistQuestion,
  type Business,
} from "./config-site";
