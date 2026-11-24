# R8 / ProGuard rules for LMSK LifeRush (Capacitor 8 + Google AdMob + Capgo Updater)
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep app entry point
-keep class com.lmsk.liferush.** { *; }

# Keep Capacitor core, annotations, bridge, and plugins (including AdMob & Updater)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep class com.getcapacitor.community.admob.** { *; }
-keep class ee.forgr.capacitor_updater.** { *; }

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Google Mobile Ads & User Messaging Platform SDK classes
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.ump.** { *; }
