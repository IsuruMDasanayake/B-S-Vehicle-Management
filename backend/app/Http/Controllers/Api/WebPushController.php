<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebPushController extends Controller
{
    public function __construct(
        protected WebPushService $webPushService
    ) {}

    /**
     * Return VAPID Public Key for browser client registration
     */
    public function getPublicKey(): JsonResponse
    {
        $publicKey = config('webpush.vapid.public_key', env('VAPID_PUBLIC_KEY'));

        return response()->json([
            'public_key' => $publicKey,
        ]);
    }

    /**
     * Store or update client PushSubscription
     */
    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint'        => 'required|string',
            'keys.p256dh'     => 'required|string',
            'keys.auth'       => 'required|string',
            'contentEncoding' => 'nullable|string',
        ]);

        $sub = PushSubscription::updateOrCreate(
            ['endpoint' => $request->endpoint],
            [
                'user_id'          => $request->user()->id,
                'public_key'       => $request->input('keys.p256dh'),
                'auth_token'       => $request->input('keys.auth'),
                'content_encoding' => $request->input('contentEncoding', 'aesgcm'),
            ]
        );

        return response()->json([
            'message'      => 'Push subscription saved successfully',
            'subscription' => $sub,
        ]);
    }

    /**
     * Unsubscribe an endpoint
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $request->endpoint)
            ->delete();

        return response()->json([
            'message' => 'Unsubscribed successfully',
        ]);
    }

    /**
     * Send test push notification to current authenticated user
     */
    public function test(Request $request): JsonResponse
    {
        $user = $request->user();

        $isStaffOrAdmin = in_array($user->role ?? '', ['superadmin', 'admin', 'hr_manager', 'super_admin']);
        $link = $isStaffOrAdmin ? '/solar/hr/admin/dashboard' : '/solar/hr/portal/home';

        $result = $this->webPushService->sendToUsers($user, [
            'title'     => '🔔 Circle HR Notification Test',
            'body'      => 'Lock-screen alerts are enabled! You will receive shift & attendance reminders on this device.',
            'link'      => $link,
            'category'  => 'general',
            'severity'  => 'success',
            'source_id' => 'test-' . time(),
        ]);

        return response()->json([
            'message' => 'Test push notification dispatched',
            'result'  => $result,
        ]);
    }
}
