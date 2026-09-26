import React, { useEffect, useState } from "react";
import { ApiClient } from "../../services/api";
import { useI18n } from "../../i18n/i18nContext";
import "./MarketplaceBrowsePage.css";

const PAGE_SIZE = 20;

export default function MarketplaceBrowsePage() {
  const { t, locale } = useI18n();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusKm, setRadiusKm] = useState("5");
  const [search, setSearch] = useState(null);
  const [page, setPage] = useState(1);
  const [stores, setStores] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search) return undefined;

    let active = true;
    const params = new URLSearchParams({
      lat: String(search.latitude),
      lng: String(search.longitude),
      radius_km: String(search.radiusKm),
      page: String(page),
      limit: String(PAGE_SIZE),
    });

    setLoading(true);
    setError("");
    setStores([]);
    setHasMore(false);

    ApiClient.get(`/browse/vendors-near?${params.toString()}`)
      .then((response) => {
        if (!Array.isArray(response?.items)) {
          throw new Error(t("marketplace.loadError"));
        }
        if (!active) return;
        setStores(response.items);
        setHasMore(response.items.length === PAGE_SIZE);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError?.error ||
            requestError?.message ||
            t("marketplace.loadError"),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, search, t]);

  const startSearch = (lat, lng) => {
    setPage(1);
    setSearch({ latitude: lat, longitude: lng, radiusKm: Number(radiusKm) });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      setError(t("marketplace.invalidCoordinates"));
      return;
    }

    setError("");
    startSearch(parsedLatitude, parsedLongitude);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError(t("marketplace.locationError"));
      return;
    }

    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(String(coords.latitude));
        setLongitude(String(coords.longitude));
        setLocating(false);
        startSearch(coords.latitude, coords.longitude);
      },
      () => {
        setLocating(false);
        setError(t("marketplace.locationError"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const formatDistance = (distanceMeters) => {
    if (distanceMeters === null || distanceMeters === undefined) return null;
    const meters = Number(distanceMeters);
    if (!Number.isFinite(meters) || meters < 0) return null;

    if (meters < 1000) {
      return `${new Intl.NumberFormat(locale).format(Math.round(meters))} m`;
    }

    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    }).format(meters / 1000)} km`;
  };

  return (
    <section
      className="marketplace-browse"
      aria-labelledby="marketplace-browse-title"
      data-testid="marketplace-browse-page"
    >
      <header className="marketplace-browse__header">
        <div>
          <p className="marketplace-browse__eyebrow">
            {t("marketplace.browseStores")}
          </p>
          <h1 id="marketplace-browse-title">{t("marketplace.title")}</h1>
          <p className="marketplace-browse__subtitle">
            {t("marketplace.subtitle")}
          </p>
        </div>
        <span className="marketplace-browse__signal" aria-hidden="true">
          <span />
        </span>
      </header>

      <form className="marketplace-browse__search" onSubmit={handleSearch}>
        <div className="marketplace-browse__fields">
          <label>
            {t("common.lat")}
            <input
              aria-label={t("common.lat")}
              inputMode="decimal"
              max="90"
              min="-90"
              name="latitude"
              onChange={(event) => setLatitude(event.target.value)}
              step="any"
              type="number"
              value={latitude}
            />
          </label>
          <label>
            {t("common.lng")}
            <input
              aria-label={t("common.lng")}
              inputMode="decimal"
              max="180"
              min="-180"
              name="longitude"
              onChange={(event) => setLongitude(event.target.value)}
              step="any"
              type="number"
              value={longitude}
            />
          </label>
          <label>
            {t("common.radius")}
            <select
              aria-label={t("common.radius")}
              onChange={(event) => setRadiusKm(event.target.value)}
              value={radiusKm}
            >
              {[2, 5, 10, 20, 50].map((radius) => (
                <option key={radius} value={radius}>
                  {radius} km
                </option>
              ))}
            </select>
          </label>
          <button
            className="marketplace-browse__button marketplace-browse__button--primary"
            disabled={loading || locating}
            type="submit"
          >
            {t("marketplace.findStores")}
          </button>
          <button
            className="marketplace-browse__button marketplace-browse__button--secondary"
            disabled={loading || locating}
            onClick={handleUseLocation}
            type="button"
          >
            {locating ? t("common.loading") : t("marketplace.useLocation")}
          </button>
        </div>
      </form>

      {error && (
        <p className="marketplace-browse__error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div
          aria-label={t("common.loading")}
          aria-live="polite"
          className="marketplace-browse__skeletons"
          data-testid="marketplace-loading"
          role="status"
        >
          <span />
          <span />
          <span />
        </div>
      )}

      {!loading && search && stores.length === 0 && !error && (
        <div className="marketplace-browse__empty" role="status">
          <h2>{t("marketplace.emptyTitle")}</h2>
          <p>{t("marketplace.emptyHint")}</p>
        </div>
      )}

      {!loading && stores.length > 0 && (
        <>
          <div className="marketplace-browse__results-heading" aria-live="polite">
            <h2>{t("marketplace.browseStores")}</h2>
            <span>{stores.length}</span>
          </div>
          <div className="marketplace-browse__grid">
            {stores.map((store, index) => {
              const distance = formatDistance(store.distance_m);
              const address =
                store.address?.trim() || t("marketplace.addressUnavailable");

              return (
                <article
                  className={`marketplace-store${index === 0 ? " marketplace-store--featured" : ""}`}
                  key={store.id}
                >
                  <span className="marketplace-store__mark" aria-hidden="true">
                    {store.name?.trim()?.charAt(0)?.toUpperCase() || "M"}
                  </span>
                  <div className="marketplace-store__content">
                    <h3>{store.name}</h3>
                    <p>{address}</p>
                  </div>
                  {distance && (
                    <p className="marketplace-store__distance">
                      <span>{t("marketplace.distance")}</span>
                      <strong>{distance}</strong>
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          {(page > 1 || hasMore) && (
            <nav
              aria-label={t("marketplace.browseStores")}
              className="marketplace-browse__pagination"
            >
              <button
                className="marketplace-browse__button marketplace-browse__button--secondary"
                disabled={loading || page === 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                type="button"
              >
                {t("common.previous")}
              </button>
              <span>{page}</span>
              <button
                className="marketplace-browse__button marketplace-browse__button--secondary"
                disabled={loading || !hasMore}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
              >
                {t("common.next")}
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
