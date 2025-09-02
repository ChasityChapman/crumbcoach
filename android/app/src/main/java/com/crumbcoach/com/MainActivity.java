package com.crumbcoach.com;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Reduce Chromium WebView logging verbosity
        // This helps silence first_paint and other performance warnings
        try {
            // Set WebView log level to reduce spam
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                // Enable debugging only in debug builds to reduce log spam in production
                boolean isDebugBuild = (0 != (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE));
                WebView.setWebContentsDebuggingEnabled(isDebugBuild);
            }
            
            // Reduce console log verbosity for WebView
            System.setProperty("webview.log.level", "WARN");
            System.setProperty("chromium.log.level", "2"); // Only show warnings and errors
            
        } catch (Exception e) {
            Log.w("MainActivity", "Failed to configure WebView logging", e);
        }
    }
}