<?php

namespace Tests\Feature;

class AuthTest extends ErpTestCase
{
    public function test_guest_cannot_access_protected_endpoints(): void
    {
        $this->getJson('/api/products')->assertUnauthorized();
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_login_returns_token_and_role(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin@erp.test',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_login_rejects_bad_credentials(): void
    {
        $this->postJson('/api/login', [
            'email' => 'admin@erp.test',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_staff_cannot_create_product_but_manager_can(): void
    {
        $payload = ['name' => 'Gate Test', 'purchase_price' => 10, 'sale_price' => 20];

        $this->postJson('/api/products', $payload, $this->staff())->assertForbidden();

        $this->postJson('/api/products', $payload, $this->manager())
            ->assertCreated()
            ->assertJsonPath('data.name', 'Gate Test');
    }

    public function test_only_admin_can_update_settings(): void
    {
        $this->putJson('/api/settings', ['currency' => 'EUR'], $this->manager())->assertForbidden();
        $this->putJson('/api/settings', ['currency' => 'EUR'], $this->staff())->assertForbidden();

        $this->putJson('/api/settings', ['currency' => 'EUR'], $this->admin())
            ->assertOk()
            ->assertJsonPath('currency', 'EUR');
    }

    public function test_logout_revokes_token(): void
    {
        $headers = $this->admin();

        $this->postJson('/api/logout', [], $headers)->assertOk();

        // Drop the guard cached during logout so the token is re-checked.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/user', $headers)->assertUnauthorized();
    }
}
