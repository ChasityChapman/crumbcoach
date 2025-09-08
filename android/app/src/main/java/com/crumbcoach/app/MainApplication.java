package com.crumbcoach.app;

import android.app.Application;
import android.util.Log;

import com.google.firebase.FirebaseApp;

public class MainApplication extends Application {
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Initialize Firebase if not already initialized
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
                Log.d("MainApplication", "Firebase initialized successfully");
            } else {
                Log.d("MainApplication", "Firebase already initialized");
            }
        } catch (Exception e) {
            Log.e("MainApplication", "Failed to initialize Firebase", e);
            // Don't crash the app if Firebase fails to initialize
        }
    }
}