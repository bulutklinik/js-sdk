import type { HttpClient } from "../http";
import type { AddressInput, AddressUpdateInput } from "../models";

/**
 * The patient's saved addresses. Required by `laboratory.order` (which needs an
 * `addressId`). `add`/`update` take a `cityId` (from `doctors.locations()`) and a
 * `districtId` (from `GET /getConfig` — `cities[].districts[]`, reachable via
 * `client.request`).
 */
export class AddressesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List the patient's saved addresses (default first). Each item's `id` is the
   * `addressId` used by `update`, `delete` and `laboratory.order`.
   */
  list(): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: "/patients/userAddress",
      auth: "bearer",
    });
  }

  /** Add an address. Success → `{ addressId }`. The first address is always the default. */
  add(input: AddressInput): Promise<unknown> {
    const body: Record<string, unknown> = {
      title: input.title,
      cityId: input.cityId,
      districtId: input.districtId,
      address: input.address,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
    };
    if (input.description !== undefined) body.description = input.description;
    if (input.isDefault !== undefined) body.isDefault = input.isDefault;
    return this.http.request<unknown>({
      method: "POST",
      path: "/patients/userAddress",
      auth: "bearer",
      body,
    });
  }

  /**
   * Update an address by `id`. Send `{ id, isDefault: 1 }` to only flip the default
   * flag, or the full set to edit it.
   */
  update(input: AddressUpdateInput): Promise<unknown> {
    const body: Record<string, unknown> = { id: input.id };
    if (input.title !== undefined) body.title = input.title;
    if (input.description !== undefined) body.description = input.description;
    if (input.cityId !== undefined) body.cityId = input.cityId;
    if (input.districtId !== undefined) body.districtId = input.districtId;
    if (input.address !== undefined) body.address = input.address;
    if (input.locationLat !== undefined) body.locationLat = input.locationLat;
    if (input.locationLng !== undefined) body.locationLng = input.locationLng;
    if (input.isDefault !== undefined) body.isDefault = input.isDefault;
    return this.http.request<unknown>({
      method: "PUT",
      path: "/patients/userAddress",
      auth: "bearer",
      body,
    });
  }

  /**
   * Delete an address by `id` (sent in the body). The default address cannot be
   * deleted — reassign the default via `update` first; an address already used on
   * an order cannot be deleted either.
   */
  delete(id: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: "/patients/userAddress",
      auth: "bearer",
      body: { id },
    });
  }
}
