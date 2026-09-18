"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function login(
    e: FormEvent
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const {
      data,
      error: loginError,
    } =
      await supabase.auth.signInWithPassword(
        {
          email:
            email.trim(),

          password,
        }
      );

    if (loginError) {
      setError(
        loginError.message
      );

      setLoading(false);

      return;
    }

    if (!data.user) {
      setError(
        "Login failed."
      );

      setLoading(false);

      return;
    }


    /*
     * If this email was assigned
     * as a team manager before the
     * user registered, claim the
     * assignment now.
     */

    const {
      error: claimError,
    } = await supabase.rpc(
      "claim_team_manager_assignments"
    );

    if (claimError) {
      console.error(
        "Manager claim:",
        claimError
      );
    }


    /*
     * Determine where this user
     * should go.
     */

    const {
      data: roleData,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role")
      .eq(
        "user_id",
        data.user.id
      )
      .maybeSingle();

    if (roleError) {
      setError(
        roleError.message
      );

      setLoading(false);

      return;
    }


    if (
      roleData?.role ===
        "admin" ||
      roleData?.role ===
        "scorer"
    ) {
      router.push(
        "/scorer"
      );

      router.refresh();

      return;
    }


    if (
      roleData?.role ===
      "team_manager"
    ) {
      router.push(
        "/manager"
      );

      router.refresh();

      return;
    }


    setError(
      "Your account does not currently have access to a team."
    );

    setLoading(false);
  }


  return (
    <main className="flex min-h-[75vh] items-center justify-center px-6">

      <div className="w-full max-w-md">

        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Account
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Login
        </h1>

        <p className="mt-3 text-zinc-400">
          Admins, scorers and team managers can log in here.
        </p>


        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}


        <form
          onSubmit={login}
          className="mt-8 space-y-5"
        >

          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
              autoComplete="email"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 outline-none focus:border-zinc-500"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm text-zinc-400">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 outline-none focus:border-zinc-500"
            />

          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-5 py-4 font-black text-black hover:bg-zinc-200 disabled:opacity-40"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>


        <div className="mt-6 text-center text-sm text-zinc-500">

          Team manager without an account?

          {" "}

          <button
            type="button"
            onClick={() =>
              router.push(
                "/manager/register"
              )
            }
            className="font-semibold text-white hover:underline"
          >
            Create account
          </button>

        </div>

      </div>

    </main>
  );
}