const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * iOS 앱을 UIScene 생명주기로 띄운다.
 *
 * iOS 27 SDK(Xcode 27) 로 빌드한 앱은 Info.plist 에 UIApplicationSceneManifest 가 없으면
 * iOS 27 에서 실행 직후 "UIScene life cycle is required for apps built with this SDK." 로 종료된다
 * (Apple TN3187). 같은 이유로 토로로가 App Review 2.1 거절을 받았다.
 *
 * Expo SDK 54 에는 ExpoAppSceneDelegate 가 없으므로 prebuild 결과를 아래처럼 바꾼다.
 * - Info.plist 에 UIApplicationSceneManifest 를 넣어 SceneDelegate 를 등록
 * - AppDelegate.swift 끝에 SceneDelegate 를 추가(pbxproj 수정을 피하려고 새 파일을 만들지 않음).
 *   RN 시작 방식은 그대로 두고, AppDelegate 가 didFinishLaunching 에서 만든 창을 씬에 붙인다.
 * - 씬 생명주기에서는 UIKit 이 AppDelegate 의 활성/백그라운드·URL·유저 액티비티·퀵 액션
 *   메서드를 부르지 않으므로 SceneDelegate 가 AppDelegate(ExpoAppDelegate → subscriber) 로 전달한다.
 */
const MARKER = 'class SceneDelegate: UIResponder, UIWindowSceneDelegate';

const SCENE_DELEGATE = `
// MARK: - UIScene 생명주기 (plugins/withSceneLifecycle.js 가 추가)

/// iOS 27 SDK 는 UIScene 생명주기를 요구한다. 창과 React Native 는 AppDelegate 가 만든 것을 그대로 쓰고,
/// 씬 이벤트를 AppDelegate 로 전달해 ExpoAppDelegate subscriber 가 계속 이벤트를 받게 한다.
${MARKER} {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let window: UIWindow
    if let existing = appDelegate?.window {
      window = existing
      window.windowScene = windowScene
      window.frame = windowScene.coordinateSpace.bounds
    } else {
      window = UIWindow(windowScene: windowScene)
      window.rootViewController = appDelegate?.window?.rootViewController
      appDelegate?.window = window
    }
    window.makeKeyAndVisible()
    self.window = window

    // 콜드 스타트 딥링크·유니버설 링크·퀵 액션은 launchOptions 대신 connectionOptions 로 들어온다.
    let application = UIApplication.shared
    connectionOptions.urlContexts.forEach {
      _ = appDelegate?.application(application, open: $0.url, options: Self.openURLOptions(from: $0.options))
    }
    connectionOptions.userActivities.forEach {
      _ = appDelegate?.application(application, continue: $0, restorationHandler: { _ in })
    }
    if let shortcutItem = connectionOptions.shortcutItem {
      appDelegate?.application(application, performActionFor: shortcutItem, completionHandler: { _ in })
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach {
      _ = appDelegate?.application(UIApplication.shared, open: $0.url, options: Self.openURLOptions(from: $0.options))
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    guard let appDelegate else {
      completionHandler(false)
      return
    }
    appDelegate.application(UIApplication.shared, performActionFor: shortcutItem, completionHandler: completionHandler)
  }

  private static func openURLOptions(from sceneOptions: UIScene.OpenURLOptions) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = sceneOptions.openInPlace
    return options
  }
}
`;

function patchAppDelegate(contents) {
  if (contents.includes(MARKER)) return contents;

  const expected = [
    'class AppDelegate: ExpoAppDelegate {',
    'var window: UIWindow?',
    'window = UIWindow(frame: UIScreen.main.bounds)',
    'factory.startReactNative(',
  ];
  const missing = expected.filter((snippet) => !contents.includes(snippet));
  if (missing.length > 0) {
    throw new Error(
      `withSceneLifecycle: AppDelegate.swift 템플릿이 예상과 달라 UIScene 패치를 적용할 수 없습니다. 없는 부분: ${missing.join(', ')}`
    );
  }

  return contents.replace(/\s*$/, '\n') + SCENE_DELEGATE;
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });

  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: Swift AppDelegate 만 지원합니다.');
    }
    mod.modResults.contents = patchAppDelegate(mod.modResults.contents);
    return mod;
  });
};
