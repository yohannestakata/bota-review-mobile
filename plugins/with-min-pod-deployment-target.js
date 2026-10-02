// Raises any CocoaPods library that targets an iOS older than 15.1 to 15.1.
// Xcode 27 refuses to build targets below iOS 15 (earlier Xcodes only
// warned). The app itself targets a newer iOS, so this changes nothing for
// users. Remove once Sentry, PostHog, ReachabilitySwift and react-native-svg
// ship podspecs targeting iOS 15+.
const { withPodfile } = require("expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

const MIN = "15.1";

module.exports = function withMinPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    cfg.modResults.contents = mergeContents({
      tag: "min-pod-deployment-target",
      src: cfg.modResults.contents,
      newSrc: [
        "    installer.pods_project.targets.each do |target|",
        "      target.build_configurations.each do |build_config|",
        "        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
        `        if current && Gem::Version.new(current) < Gem::Version.new('${MIN}')`,
        `          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN}'`,
        "        end",
        "      end",
        "    end",
      ].join("\n"),
      anchor: /post_install do \|installer\|/,
      offset: 1,
      comment: "#",
    }).contents;
    return cfg;
  });
};
