# Keep OkHttp / JSON reflection surfaces used by release minify.
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keepclassmembers class * {
  @androidx.annotation.Keep *;
}
