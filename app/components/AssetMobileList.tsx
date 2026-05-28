import Link from "next/link";
import { parseNetworkFromNotes } from "../../lib/asset-network";
import { assetStatusBadgeClass } from "../../lib/asset-status";

export type AssetMobileListItem = {
  id: number;
  name: string;
  type: string;
  status?: string;
  notes?: string | null;
  site_name?: string;
  client_name?: string;
  ip_address?: string | null;
};

type AssetMobileListProps = {
  assets: AssetMobileListItem[];
  ariaLabel?: string;
};

export default function AssetMobileList({
  assets,
  ariaLabel = "Mobile asset cards",
}: AssetMobileListProps) {
  return (
    <section className="asset-mobile-list md:hidden" aria-label={ariaLabel}>
      {assets.map((asset) => {
        const parsed = parseNetworkFromNotes(asset.notes);
        const ip = asset.ip_address?.trim() || parsed.ip;
        const mac = parsed.mac;
        const location = [asset.client_name, asset.site_name].filter(Boolean).join(" · ");

        return (
          <Link key={asset.id} href={`/assets/${asset.id}`} className="asset-mobile-card">
            <div className="asset-mobile-card__head">
              <span className="asset-mobile-card__name">{asset.name}</span>
              <div className="asset-mobile-card__badges">
                <span className="asset-type-badge">{asset.type}</span>
                {asset.status ? (
                  <span className={assetStatusBadgeClass(asset.status)}>{asset.status}</span>
                ) : null}
              </div>
            </div>
            {ip ? (
              <p className="asset-mobile-card__row">
                <span>IP</span> {ip}
              </p>
            ) : null}
            {mac ? (
              <p className="asset-mobile-card__row">
                <span>MAC</span> {mac}
              </p>
            ) : null}
            {location ? <p className="asset-mobile-card__site">{location}</p> : null}
          </Link>
        );
      })}
    </section>
  );
}
