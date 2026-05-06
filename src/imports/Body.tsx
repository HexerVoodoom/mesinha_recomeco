import clsx from "clsx";
import svgPaths from "./svg-obje8q03tf";
type BackgroundImage3Props = {
  additionalClassNames?: string;
};

function BackgroundImage3({ children, additionalClassNames = "" }: React.PropsWithChildren<BackgroundImage3Props>) {
  return (
    <div style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties} className={clsx("flex items-center justify-center relative shrink-0", additionalClassNames)}>
      {children}
    </div>
  );
}
type BackgroundBorderShadowBackgroundImageProps = {
  additionalClassNames?: string;
};

function BackgroundBorderShadowBackgroundImage({ children, additionalClassNames = "" }: React.PropsWithChildren<BackgroundBorderShadowBackgroundImageProps>) {
  return (
    <div className={clsx("bg-white relative rounded-[32px] shrink-0 w-full", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[32px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[17px] relative w-full">{children}</div>
    </div>
  );
}
type ContainerBackgroundImage3Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage3({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage3Props>) {
  return (
    <div className={clsx("relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative w-full">{children}</div>
    </div>
  );
}
type BackgroundBackgroundImageProps = {
  additionalClassNames?: string;
};

function BackgroundBackgroundImage({ children, additionalClassNames = "" }: React.PropsWithChildren<BackgroundBackgroundImageProps>) {
  return (
    <div className={clsx("absolute bg-[#e9e4df] rounded-[9999px] top-[-10.5px]", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start px-[16px] py-[4px] relative w-full">{children}</div>
    </div>
  );
}

function BackgroundImage2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <div className="flex flex-col font-['Quicksand:Semi_Bold',sans-serif] h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#2b2a28] text-[14px] w-[74.72px]">{children}</div>
    </div>
  );
}

function BackgroundImage1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[18px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        {children}
      </svg>
    </div>
  );
}

function BackgroundImage({ children }: React.PropsWithChildren<{}>) {
  return (
    <BackgroundImage1>
      <g id="Container">{children}</g>
    </BackgroundImage1>
  );
}

function ContainerBackgroundImage2() {
  return (
    <BackgroundImage>
      <path d={svgPaths.p29aba000} fill="var(--fill-0, #4D989B)" id="Icon" />
    </BackgroundImage>
  );
}

function ContainerBackgroundImage1() {
  return (
    <div className="h-[6px] relative shrink-0 w-[3.703px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3.70312 6">
        <g id="Container">
          <path d={svgPaths.p13ab58d0} fill="var(--fill-0, #8A847D)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function ContainerBackgroundImage() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[79.03px]">
      <BackgroundImage2>
        <p className="leading-[20px]">{"Novo Filme"}</p>
      </BackgroundImage2>
      <ContainerBackgroundImageAndText2 text="Amanda • 02 Abr" />
    </div>
  );
}
type ContainerBackgroundImageAndText2Props = {
  text: string;
};

function ContainerBackgroundImageAndText2({ text }: ContainerBackgroundImageAndText2Props) {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <div className="flex flex-col font-['Quicksand:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[10px] w-[79.03px]">
        <p className="leading-[15px]">{text}</p>
      </div>
    </div>
  );
}
type BackgroundShadowBackgroundImageProps = {
  additionalClassNames?: string;
};

function BackgroundShadowBackgroundImage({ additionalClassNames = "" }: BackgroundShadowBackgroundImageProps) {
  return (
    <div className={clsx("relative rounded-[9999px] shrink-0 size-[40px]", additionalClassNames)}>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]" />
    </div>
  );
}
type ContainerBackgroundImageAndText1Props = {
  text: string;
};

function ContainerBackgroundImageAndText1({ text }: ContainerBackgroundImageAndText1Props) {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#2b2a28] text-[10px] text-center w-[36.02px]">
        <p className="leading-[15px]">{text}</p>
      </div>
    </div>
  );
}
type BackgroundBorderBackgroundImageProps = {
  additionalClassNames?: string;
};

function BackgroundBorderBackgroundImage({ additionalClassNames = "" }: BackgroundBorderBackgroundImageProps) {
  return (
    <div className={clsx("relative rounded-[24px] shrink-0 size-[32px]", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[#f3f4f6] border-solid inset-0 pointer-events-none rounded-[24px]" />
    </div>
  );
}
type ContainerBackgroundImageAndTextProps = {
  text: string;
};

function ContainerBackgroundImageAndText({ text }: ContainerBackgroundImageAndTextProps) {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0">
      <div className="flex flex-col font-['Liberation_Mono:Regular',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[12px] w-[43.22px]">
        <p className="leading-[16px]">{text}</p>
      </div>
    </div>
  );
}
type HeadingBackgroundImageAndTextProps = {
  text: string;
  additionalClassNames?: string;
};

function HeadingBackgroundImageAndText({ text, additionalClassNames = "" }: HeadingBackgroundImageAndTextProps) {
  return (
    <div className={clsx("content-stretch flex flex-col items-start relative shrink-0 w-full", additionalClassNames)}>
      <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#8a847d] text-[12px] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">{text}</p>
      </div>
    </div>
  );
}

export default function Body() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start pb-[86px] pt-[24px] px-[24px] relative size-full" data-name="Body" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 390 1787\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(27.577 0 0 126.36 195 893.5)\\'><stop stop-color=\\'rgba(229,231,235,1)\\' offset=\\'0.014731\\'/><stop stop-color=\\'rgba(229,231,235,0)\\' offset=\\'0.014731\\'/></radialGradient></defs></svg>'), linear-gradient(90deg, rgb(248, 246, 244) 0%, rgb(248, 246, 244) 100%)" }}>
      <div className="content-stretch flex flex-col items-center justify-center py-[32px] relative shrink-0 w-full" data-name="Header">
        <div className="content-stretch flex flex-col items-start pb-[4px] relative shrink-0" data-name="Heading 1:margin">
          <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[36px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[30px] tracking-[-0.75px] w-[72.31px]">
            <p className="leading-[36px]">UI Kit</p>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
          <div className="flex flex-col font-['Quicksand:Semi_Bold',sans-serif] h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[14px] tracking-[1.4px] uppercase w-[214.61px]">
            <p className="leading-[20px]">Shared Couple Lists App</p>
          </div>
        </div>
        <div className="absolute content-stretch flex flex-col items-start left-[24.02%] opacity-40 right-[64.47%] top-[-1.34px]" data-name="Container">
          <BackgroundImage3 additionalClassNames="h-[33.119px] w-[35.015px]">
            <div className="-rotate-12 flex-none">
              <div className="h-[27.492px] relative w-[29.953px]" data-name="Icon">
                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.9531 27.4922">
                  <path d={svgPaths.p255130d8} fill="var(--fill-0, #FFDBE4)" id="Icon" />
                </svg>
              </div>
            </div>
          </BackgroundImage3>
        </div>
        <div className="absolute content-stretch flex flex-col items-start left-[59.66%] opacity-30 right-1/4 top-[11.53px]" data-name="Container">
          <BackgroundImage3 additionalClassNames="h-[41.342px] w-[53.617px]">
            <div className="flex-none rotate-12">
              <div className="h-[32.063px] relative w-[48px]" data-name="Icon">
                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 32.0625">
                  <path d={svgPaths.p39b3000} fill="var(--fill-0, #4D989B)" id="Icon" />
                </svg>
              </div>
            </div>
          </BackgroundImage3>
        </div>
      </div>
      <div className="content-stretch flex flex-col gap-[32px] items-start max-w-[448px] relative shrink-0 w-full" data-name="Container">
        <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Container">
          <div className="bg-white relative rounded-[32px] shrink-0 w-full" data-name="Section">
            <div className="overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex flex-col items-start p-[25px] relative w-full">
                <div className="relative shrink-0 w-full" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start pt-[8px] relative w-full">
                    <HeadingBackgroundImageAndText text="Base" />
                    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
                        <BackgroundBorderBackgroundImage additionalClassNames="bg-[#f8f6f4]" />
                        <ContainerBackgroundImageAndText text="F8F6F4" />
                      </div>
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
                        <BackgroundBorderBackgroundImage additionalClassNames="bg-white" />
                        <ContainerBackgroundImageAndText text="FFFFFF" />
                      </div>
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
                        <BackgroundBorderBackgroundImage additionalClassNames="bg-[#e9e4df]" />
                        <ContainerBackgroundImageAndText text="E9E4DF" />
                      </div>
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
                        <div className="bg-[#2b2a28] rounded-[24px] shrink-0 size-[32px]" data-name="Background" />
                        <ContainerBackgroundImageAndText text="2B2A28" />
                      </div>
                    </div>
                    <HeadingBackgroundImageAndText text="Primary" additionalClassNames="pt-[8px]" />
                    <div className="content-stretch flex gap-[16px] h-[59px] items-start relative shrink-0 w-full" data-name="Container">
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative self-stretch shrink-0" data-name="Container">
                        <BackgroundShadowBackgroundImage additionalClassNames="bg-[#ffdbe4]" />
                        <ContainerBackgroundImageAndText1 text="FFDBE4" />
                      </div>
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative self-stretch shrink-0" data-name="Container">
                        <BackgroundShadowBackgroundImage additionalClassNames="bg-[#4d989b]" />
                        <ContainerBackgroundImageAndText1 text="4D989B" />
                      </div>
                      <div className="content-stretch flex flex-col gap-[4px] items-start relative self-stretch shrink-0" data-name="Container">
                        <BackgroundShadowBackgroundImage additionalClassNames="bg-[#d7efed]" />
                        <ContainerBackgroundImageAndText1 text="D7EFED" />
                      </div>
                    </div>
                  </div>
                </div>
                <BackgroundBackgroundImage additionalClassNames="left-[39.94%] right-[39.94%]">
                  <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[10px] tracking-[-0.5px] uppercase w-[36.82px]">
                    <p className="leading-[15px]">Colors</p>
                  </div>
                </BackgroundBackgroundImage>
              </div>
            </div>
            <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[32px] shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]" />
          </div>
          <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Container">
            <div className="bg-white relative rounded-[32px] shrink-0 w-full" data-name="Section">
              <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[32px]" />
              <div className="content-stretch flex flex-col items-start p-[25px] relative w-full">
                <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[32px] shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]" data-name="Section:shadow" />
                <div className="h-[127px] relative shrink-0 w-full" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 pb-[2px] right-[154px] top-[8px]" data-name="Container">
                      <div className="bg-[#4d989b] relative rounded-[9999px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.05)] shrink-0 w-full" data-name="Button">
                        <div className="flex flex-row items-center justify-center size-full">
                          <div className="content-stretch flex items-center justify-center px-[16px] py-[12px] relative w-full">
                            <div className="flex flex-col font-['Quicksand:Semi_Bold',sans-serif] h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-white w-[42.38px]">
                              <p className="leading-[20px]">Salvar</p>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_1px_0px_rgba(255,255,255,0.8)]" />
                      </div>
                      <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
                        <div className="flex flex-col font-['Quicksand:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[10px] text-center w-[70.14px]">
                          <p className="leading-[15px]">Primary Button</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-[154px] right-0 top-[8px]" data-name="Container">
                      <div className="bg-white relative rounded-[9999px] shrink-0 w-full" data-name="Button">
                        <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[9999px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" />
                        <div className="flex flex-row items-center justify-center size-full">
                          <div className="content-stretch flex items-center justify-center px-[17px] py-[13px] relative w-full">
                            <div className="flex flex-col font-['Quicksand:Semi_Bold',sans-serif] h-[20px] justify-center leading-[0] not-italic relative shrink-0 text-[#2b2a28] text-[14px] text-center w-[44.94px]">
                              <p className="leading-[20px]">Button</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
                        <div className="flex flex-col font-['Quicksand:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[10px] text-center w-[83.41px]">
                          <p className="leading-[15px]">Secondary Button</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute bg-white content-stretch flex items-center justify-center left-0 px-[17px] py-[9px] right-[154px] rounded-[9999px] top-[93px]" data-name="Button">
                      <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[9999px]" />
                      <div className="flex flex-col font-['Quicksand:Medium',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#2b2a28] text-[12px] text-center w-[50.33px]">
                        <p className="leading-[16px]">Cancelar</p>
                      </div>
                    </div>
                    <div className="absolute content-stretch flex items-center justify-center left-[154px] py-[9px] right-0 top-[93px]" data-name="Container">
                      <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[#4d989b] text-[12px] text-center tracking-[0.3px] uppercase w-[85.81px]">
                        <p className="leading-[16px]">Text Button</p>
                      </div>
                    </div>
                  </div>
                </div>
                <BackgroundBackgroundImage additionalClassNames="left-[38.94%] right-[38.94%]">
                  <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[10px] tracking-[-0.5px] uppercase w-[43.64px]">
                    <p className="leading-[15px]">Buttons</p>
                  </div>
                </BackgroundBackgroundImage>
              </div>
            </div>
            <div className="bg-white relative rounded-[32px] shrink-0 w-full" data-name="Section">
              <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[32px]" />
              <div className="content-stretch flex flex-col gap-[24px] items-start p-[25px] relative w-full">
                <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_0_0.03px_0] rounded-[32px] shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]" data-name="Section:shadow" />
                <div className="h-[38.031px] relative shrink-0 w-full" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[37.6px] items-start pl-[10.8px] pr-[10.83px] pt-[16px] relative size-full">
                    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
                      <BackgroundImage1>
                        <path d={svgPaths.p3deb0c00} fill="var(--fill-0, #2B2A28)" id="Icon" />
                      </BackgroundImage1>
                    </div>
                    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
                      <div className="h-[18.984px] relative shrink-0 w-[19.969px]" data-name="Icon">
                        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.9688 18.9844">
                          <path d={svgPaths.p385c6c80} fill="var(--fill-0, #2B2A28)" id="Icon" />
                        </svg>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
                      <div className="h-[19.969px] relative shrink-0 w-[13.969px]" data-name="Icon">
                        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.9688 19.9688">
                          <path d={svgPaths.p290ff100} fill="var(--fill-0, #2B2A28)" id="Icon" />
                        </svg>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
                      <div className="h-[18.328px] relative shrink-0 w-[19.969px]" data-name="Icon">
                        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.9688 18.3281">
                          <path d={svgPaths.p399fbb00} fill="var(--fill-0, #2B2A28)" id="Icon" />
                        </svg>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
                      <div className="h-[22.031px] relative shrink-0 w-[19.969px]" data-name="Icon">
                        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.9688 22.0312">
                          <path d={svgPaths.p10831780} fill="var(--fill-0, #2B2A28)" id="Icon" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-[37px] relative shrink-0 w-full" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[32px] items-start justify-center relative size-full">
                    <div className="content-stretch flex flex-col gap-[4px] items-start relative self-stretch shrink-0" data-name="Container">
                      <BackgroundImage1>
                        <path d={svgPaths.p3deb0c00} fill="var(--fill-0, #4D989B)" id="Icon" />
                      </BackgroundImage1>
                      <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
                        <div className="flex flex-col font-['Quicksand:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[10px] text-center w-[17.23px]">
                          <p className="leading-[15px]">Edit</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[4px] items-center relative self-stretch shrink-0" data-name="Container">
                      <div className="h-[18px] relative shrink-0 w-[13.969px]" data-name="Icon">
                        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.9688 18">
                          <path d={svgPaths.p1c63b00} fill="var(--fill-0, #8A847D)" id="Icon" />
                        </svg>
                      </div>
                      <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Container">
                        <div className="flex flex-col font-['Quicksand:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[10px] text-center w-[25.61px]">
                          <p className="leading-[15px]">Trash</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <BackgroundBackgroundImage additionalClassNames="left-[41.31%] right-[41.31%]">
                  <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[10px] tracking-[-0.5px] uppercase w-[27.44px]">
                    <p className="leading-[15px]">Icons</p>
                  </div>
                </BackgroundBackgroundImage>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white relative rounded-[16px] shrink-0 w-full" data-name="Section">
          <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[16px]" />
          <div className="content-stretch flex flex-col items-start p-[33px] relative w-full">
            <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[16px] shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]" data-name="Section:shadow" />
            <BackgroundBackgroundImage additionalClassNames="left-[34.54%] right-[34.54%]">
              <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[10px] tracking-[-0.5px] uppercase w-[73.75px]">
                <p className="leading-[15px]">{`Inputs & Cards`}</p>
              </div>
            </BackgroundBackgroundImage>
            <div className="bg-[#f8f6f4] relative rounded-[32px] shrink-0 w-full" data-name="Background+Border+Shadow">
              <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[32px]" />
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[24px] items-start p-[21px] relative w-full">
                <div className="relative shrink-0 w-full" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative w-full">
                    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="Container">
                      <div className="content-stretch flex flex-col h-[28px] items-start pt-[4px] relative shrink-0 w-[24px]" data-name="Margin">
                        <div className="bg-white relative rounded-[6px] shrink-0 size-[24px]" data-name="Background+Border">
                          <div aria-hidden="true" className="absolute border-2 border-[rgba(77,152,155,0.3)] border-solid inset-0 pointer-events-none rounded-[6px]" />
                        </div>
                      </div>
                      <div className="content-stretch flex flex-col items-start relative shrink-0 w-[148.27px]" data-name="Container">
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 4">
                          <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[18px] w-[148.27px]">
                            <p className="leading-[28px]">Lista de Destinos</p>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
                          <div className="flex flex-col font-['Quicksand:Regular',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[12px] w-[80.5px]">
                            <p className="leading-[16px]">André • 02 Abr</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-[7.406px] relative shrink-0 w-[12px]" data-name="Icon">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 7.40625">
                        <path d={svgPaths.p122be600} fill="var(--fill-0, #8A847D)" id="Icon" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="relative shrink-0 w-full" data-name="HorizontalBorder">
                  <div aria-hidden="true" className="absolute border-[#e9e4df] border-solid border-t inset-0 pointer-events-none" />
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start pt-[25px] relative w-full">
                    <div className="bg-white relative rounded-[24px] shrink-0 w-full" data-name="Input">
                      <div className="flex flex-row justify-center overflow-clip rounded-[inherit] size-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-center px-[17px] py-[14px] relative w-full">
                          <div className="flex-[1_0_0] min-h-px min-w-px relative" data-name="Container">
                            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] w-full">
                              <div className="flex flex-col font-['Quicksand:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[14px] w-full">
                                <p className="leading-[normal]">Adicionar um comentário...</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px]" />
                    </div>
                    <ContainerBackgroundImage3 additionalClassNames="w-[290.6px]">
                      <div className="content-stretch flex gap-[4px] items-center px-[13px] py-[9px] relative rounded-[24px] shrink-0" data-name="Button">
                        <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px]" />
                        <div className="relative shrink-0 size-[8.148px]" data-name="Container">
                          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.14844 8.14844">
                            <g id="Container">
                              <path d={svgPaths.pe195d80} fill="var(--fill-0, #8A847D)" id="Icon" />
                            </g>
                          </svg>
                        </div>
                        <div className="flex flex-col font-['Quicksand:Medium',sans-serif] h-[32px] justify-center leading-[16px] not-italic relative shrink-0 text-[#8a847d] text-[12px] text-center w-[53.16px]">
                          <p className="mb-0">Adicionar</p>
                          <p>tag</p>
                        </div>
                      </div>
                      <div className="content-stretch flex gap-[7.99px] items-start relative shrink-0" data-name="Container">
                        <div className="bg-white content-stretch flex flex-col items-center justify-center px-[17px] py-[9px] relative rounded-[24px] shrink-0" data-name="Button">
                          <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px]" />
                          <div className="flex flex-col font-['Quicksand:Medium',sans-serif] h-[16px] justify-center leading-[0] not-italic relative shrink-0 text-[#2b2a28] text-[12px] text-center w-[50.33px]">
                            <p className="leading-[16px]">Cancelar</p>
                          </div>
                        </div>
                        <div className="bg-[#4d989b] content-stretch flex flex-col items-center justify-center pb-[9.5px] pt-[8.5px] px-[24px] relative rounded-[24px] shrink-0" data-name="Button">
                          <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[16px] justify-center leading-[0] relative shrink-0 text-[12px] text-center text-white w-[37.11px]">
                            <p className="leading-[16px]">Salvar</p>
                          </div>
                        </div>
                      </div>
                    </ContainerBackgroundImage3>
                  </div>
                </div>
                <div className="absolute right-[-15px] top-[-31px]" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[8px] pl-[8px] relative">
                    <div className="bg-[#4d989b] content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[48px]" data-name="Button">
                      <div className="absolute bg-[rgba(255,255,255,0)] left-0 rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-[48px] top-0" data-name="Button:shadow" />
                      <div className="relative shrink-0 size-[17.461px]" data-name="Container">
                        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.4609 17.4609">
                          <g id="Container">
                            <path d={svgPaths.p2714400} fill="var(--fill-0, white)" id="Icon" />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.03)]" />
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Section">
          <div className="content-stretch flex gap-[16px] items-center justify-center relative shrink-0 w-full" data-name="Container">
            <div className="bg-[#e9e4df] flex-[1_0_0] h-px min-h-px min-w-px" data-name="Horizontal Divider" />
            <div className="bg-[#e9e4df] content-stretch flex flex-col items-start px-[16px] py-[4px] relative rounded-[9999px] shrink-0" data-name="Background">
              <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#2b2a28] text-[10px] tracking-[-0.5px] uppercase w-[55.8px]">
                <p className="leading-[15px]">Item States</p>
              </div>
            </div>
            <div className="bg-[#e9e4df] flex-[1_0_0] h-px min-h-px min-w-px" data-name="Horizontal Divider" />
          </div>
          <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Container">
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
              <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
                <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#8a847d] text-[10px] text-center uppercase w-[74.8px]">
                  <p className="leading-[15px]">Default State</p>
                </div>
              </div>
              <div className="bg-white relative rounded-[32px] shrink-0 w-full" data-name="Background+Border+Shadow">
                <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[32px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" />
                <div className="flex flex-row items-center size-full">
                  <div className="content-stretch flex items-center justify-between p-[17px] relative w-full">
                    <div className="relative shrink-0" data-name="Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative">
                        <BackgroundImage>
                          <path d={svgPaths.p1b745240} fill="var(--fill-0, #8A847D)" fillOpacity="0.4" id="Icon" />
                        </BackgroundImage>
                        <ContainerBackgroundImage />
                      </div>
                    </div>
                    <ContainerBackgroundImage1 />
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
              <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
                <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#8a847d] text-[10px] text-center uppercase w-[84.06px]">
                  <p className="leading-[15px]">Expanded State</p>
                </div>
              </div>
              <BackgroundBorderShadowBackgroundImage>
                <ContainerBackgroundImage3 additionalClassNames="w-full">
                  <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Container">
                    <ContainerBackgroundImage2 />
                    <ContainerBackgroundImage />
                  </div>
                  <div className="h-[3.703px] relative shrink-0 w-[6px]" data-name="Container">
                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 3.70312">
                      <g id="Container">
                        <path d={svgPaths.p798b900} fill="var(--fill-0, #8A847D)" id="Icon" />
                      </g>
                    </svg>
                  </div>
                </ContainerBackgroundImage3>
                <div className="relative rounded-[24px] shrink-0" data-name="Button">
                  <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px]" />
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-center px-[13px] py-[5px] relative">
                    <div className="relative shrink-0 size-[6.984px]" data-name="Container">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.98438 6.98438">
                        <g id="Container">
                          <path d={svgPaths.p18a20e80} fill="var(--fill-0, #8A847D)" id="Icon" />
                        </g>
                      </svg>
                    </div>
                    <div className="flex flex-col font-['Quicksand:Medium',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#8a847d] text-[10px] text-center w-[63.11px]">
                      <p className="leading-[15px]">Adicionar tag</p>
                    </div>
                  </div>
                </div>
              </BackgroundBorderShadowBackgroundImage>
            </div>
            <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
              <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
                <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#8a847d] text-[10px] text-center uppercase w-[60.22px]">
                  <p className="leading-[15px]">Done State</p>
                </div>
              </div>
              <BackgroundBorderShadowBackgroundImage additionalClassNames="opacity-80">
                <ContainerBackgroundImage3 additionalClassNames="w-full">
                  <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Container">
                    <ContainerBackgroundImage2 />
                    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[79.03px]" data-name="Container">
                      <BackgroundImage2>
                        <p className="[text-decoration-skip-ink:none] decoration-solid leading-[20px] line-through">Novo Filme</p>
                      </BackgroundImage2>
                      <ContainerBackgroundImageAndText2 text="Amanda • 02 Abr" />
                    </div>
                  </div>
                  <ContainerBackgroundImage1 />
                </ContainerBackgroundImage3>
                <div className="relative shrink-0 w-full" data-name="Container">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative w-full">
                    <div className="h-[6.703px] relative shrink-0 w-[8.789px]" data-name="Container">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.78906 6.70312">
                        <g id="Container">
                          <path d={svgPaths.p9e48a40} fill="var(--fill-0, #4D989B)" id="Icon" />
                        </g>
                      </svg>
                    </div>
                    <div className="flex flex-col font-['Quicksand:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] relative shrink-0 text-[#4d989b] text-[10px] w-[24.02px]">
                      <p className="leading-[15px]">Feito</p>
                    </div>
                  </div>
                </div>
              </BackgroundBorderShadowBackgroundImage>
              <div className="absolute backdrop-blur-[2px] bg-[rgba(77,152,155,0.4)] bottom-[-16px] content-stretch flex items-center justify-center p-px right-[-8px] rounded-[9999px] size-[40px]" data-name="Button">
                <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none rounded-[9999px]" />
                <div className="relative shrink-0 size-[13.969px]" data-name="Container">
                  <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.9688 13.9688">
                    <g id="Container">
                      <path d={svgPaths.p2ef98d80} fill="var(--fill-0, white)" id="Icon" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[24px] content-stretch flex flex-col items-start left-[24px]" data-name="Container">
        <div className="bg-[#2b2a28] content-stretch flex items-center justify-center relative rounded-[9999px] shrink-0 size-[48px]" data-name="Button">
          <div className="absolute bg-[rgba(255,255,255,0)] left-0 rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-[48px] top-0" data-name="Button:shadow" />
          <BackgroundImage>
            <path d={svgPaths.p241b7400} fill="var(--fill-0, white)" id="Icon" />
          </BackgroundImage>
        </div>
      </div>
    </div>
  );
}