package com.rudderstack.integration.reactnative.appcenter;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.microsoft.appcenter.analytics.Analytics;
import com.rudderstack.android.integrations.appcenter.AppcenterIntegrationFactory;
import com.rudderstack.react.android.RNRudderAnalytics;

public class RudderIntegrationAppcenterReactNativeModule
  extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;

  public RudderIntegrationAppcenterReactNativeModule(
    ReactApplicationContext reactContext
  ) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "RudderIntegrationAppcenterReactNative";
  }

  @ReactMethod
  public void setup(Promise promise) {
    RNRudderAnalytics.addIntegration(AppcenterIntegrationFactory.FACTORY);
    promise.resolve(null);
  }

  @ReactMethod
  public void enableAnalytics() {
    Analytics.setEnabled(true);
  }

  @ReactMethod
  public void disableAnalytics() {
    Analytics.setEnabled(false);
  }
}
