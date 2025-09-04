package com.crumbcoach.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure WebView for better debugging
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                // Always enable debugging for development
                WebView.setWebContentsDebuggingEnabled(true);
                Log.d("MainActivity", "WebView debugging enabled");
            }
            
        } catch (Exception e) {
            Log.e("MainActivity", "Failed to configure WebView debugging", e);
        }
    }
}