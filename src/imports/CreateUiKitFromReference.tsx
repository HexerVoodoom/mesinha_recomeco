import clsx from "clsx";
import svgPaths from "./svg-qequ5r8rj9";
import imgDiv from "figma:asset/d35f9ee94ddbebc2679de29a725bb3a3047255e9.png";

function Wrapper7({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        {children}
      </svg>
    </div>
  );
}
type Container4Props = {
  additionalClassNames?: string;
};

function Container4({ children, additionalClassNames = "" }: React.PropsWithChildren<Container4Props>) {
  return (
    <div className={clsx("bg-white relative rounded-[16px] shrink-0 w-full", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border-2 border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.04)]" />
      <div className="content-stretch flex flex-col items-start pb-[2px] pt-[18px] px-[18px] relative size-full">{children}</div>
    </div>
  );
}
type Wrapper6Props = {
  additionalClassNames?: string;
};

function Wrapper6({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper6Props>) {
  return (
    <div className={clsx("flex-[1_0_0] min-h-px min-w-px relative", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}

function Container3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex-[1_0_0] h-[48px] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">{children}</div>
    </div>
  );
}

function Container2({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[20px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">{children}</div>
    </div>
  );
}

function Container1({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="h-[72px] relative shrink-0 w-[48px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-center relative size-full">{children}</div>
    </div>
  );
}
type Wrapper5Props = {
  additionalClassNames?: string;
};

function Wrapper5({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper5Props>) {
  return (
    <div className={clsx("absolute size-[32px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        {children}
      </svg>
    </div>
  );
}
type Wrapper4Props = {
  additionalClassNames?: string;
};

function Wrapper4({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper4Props>) {
  return (
    <div className={additionalClassNames}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">{children}</div>
    </div>
  );
}
type Wrapper3Props = {
  additionalClassNames?: string;
};

function Wrapper3({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper3Props>) {
  return <Wrapper4 additionalClassNames={clsx("h-[20px] relative", additionalClassNames)}>{children}</Wrapper4>;
}
type Wrapper2Props = {
  additionalClassNames?: string;
};

function Wrapper2({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper2Props>) {
  return (
    <div className={clsx("size-[24px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        {children}
      </svg>
    </div>
  );
}
type Wrapper1Props = {
  additionalClassNames?: string;
};

function Wrapper1({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper1Props>) {
  return (
    <div className={clsx("relative shrink-0 size-[28px]", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[4px] px-[4px] relative size-full">{children}</div>
    </div>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("size-[28px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        {children}
      </svg>
    </div>
  );
}

function Icon({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper additionalClassNames="relative shrink-0">
      <g id="Icon">{children}</g>
    </Wrapper>
  );
}
type ButtonProps = {
  additionalClassNames?: string;
};

function Button({ additionalClassNames = "" }: ButtonProps) {
  return (
    <Wrapper1 additionalClassNames="rounded-[10px]">
      <ChevronRight additionalClassNames="shrink-0" />
    </Wrapper1>
  );
}
type ChevronRightProps = {
  additionalClassNames?: string;
};

function ChevronRight({ additionalClassNames = "" }: ChevronRightProps) {
  return (
    <div className={clsx("h-[20px] overflow-clip relative w-full", additionalClassNames)}>
      <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.66667 11.6667">
            <path d={svgPaths.p324d0480} id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Plus() {
  return (
    <Wrapper2 additionalClassNames="relative shrink-0">
      <g id="Plus">
        <path d="M5 12H19" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M12 5V19" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </g>
    </Wrapper2>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return (
    <div className="absolute content-stretch flex h-[20px] items-start left-0 top-[28px] w-[286px]">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#8a847d] text-[14px]">{text}</p>
    </div>
  );
}
type ContainerTextProps = {
  text: string;
};

function ContainerText({ text }: ContainerTextProps) {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#8a847d] text-[14px]">{text}</p>
    </div>
  );
}
type PText1Props = {
  text: string;
};

function PText1({ text }: PText1Props) {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#8a847d] text-[12px] text-center">{text}</p>
    </div>
  );
}
type PTextProps = {
  text: string;
  additionalClassNames?: string;
};

function PText({ text, additionalClassNames = "" }: PTextProps) {
  return (
    <div className={clsx("absolute content-stretch flex h-[20px] items-start left-0 w-[279px]", additionalClassNames)}>
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#8a847d] text-[14px] text-center">{text}</p>
    </div>
  );
}
type SpanTextProps = {
  text: string;
  additionalClassNames?: string;
};

function SpanText({ text, additionalClassNames = "" }: SpanTextProps) {
  return (
    <Wrapper4 additionalClassNames={clsx("h-[16px] relative shrink-0", additionalClassNames)}>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#2b2a28] text-[12px] whitespace-nowrap">{text}</p>
    </Wrapper4>
  );
}
type ContainerProps = {
  additionalClassNames?: string;
};

function Container({ additionalClassNames = "" }: ContainerProps) {
  return (
    <div className={clsx("flex-[1_0_0] min-h-px min-w-px relative rounded-[14px] w-[48px]", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border-2 border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[14px]" />
    </div>
  );
}
type TextProps = {
  text: string;
};

function Text({ text }: TextProps) {
  return (
    <div className="h-[24px] relative shrink-0 w-full">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#2b2a28] text-[16px] top-[-2px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type HTextProps = {
  text: string;
  additionalClassNames?: string;
};

function HText({ text, additionalClassNames = "" }: HTextProps) {
  return (
    <div className={clsx("absolute h-[27px] left-[24px] top-[8px]", additionalClassNames)}>
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[27px] left-0 not-italic text-[#2b2a28] text-[18px] top-[-1px] whitespace-nowrap">{text}</p>
    </div>
  );
}

export default function CreateUiKitFromReference() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative size-full" data-name="Create UI Kit from Reference">
      <div className="h-[1261px] relative shrink-0 w-full" data-name="div">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-[#f8f6f4] inset-0" />
          <img alt="" className="absolute max-w-none object-cover size-full" src={imgDiv} />
        </div>
        <div className="content-stretch flex flex-col items-start pt-[32px] px-[61px] relative size-full">
          <div className="h-[1197px] relative shrink-0 w-full" data-name="Container">
            <div className="absolute h-[48px] left-0 top-0 w-[1280px]" data-name="Container">
              <Wrapper5 additionalClassNames="left-[461.92px] top-[8px]">
                <g id="Heart">
                  <path d={svgPaths.p261b2200} fill="var(--fill-0, #FFDBE4)" id="Vector" stroke="var(--stroke-0, #FFDBE4)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                </g>
              </Wrapper5>
              <Wrapper2 additionalClassNames="absolute left-[509.92px] top-[12px]">
                <g id="Heart">
                  <path d={svgPaths.p1dff4600} id="Vector" stroke="var(--stroke-0, #FFDBE4)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </g>
              </Wrapper2>
              <Wrapper additionalClassNames="absolute left-[549.92px] top-[10px]">
                <g id="Heart">
                  <path d={svgPaths.p1dcc0100} fill="var(--fill-0, #FFDBE4)" id="Vector" stroke="var(--stroke-0, #FFDBE4)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.33333" />
                </g>
              </Wrapper>
              <div className="absolute h-[48px] left-[593.92px] top-0 w-[120.141px]" data-name="h1">
                <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[48px] left-[60.5px] not-italic text-[#2b2a28] text-[48px] text-center top-[-3px] whitespace-nowrap">UI Kit</p>
              </div>
              <div className="absolute left-[730.06px] size-[40px] top-[4px]" data-name="Cloud">
                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
                  <g id="Cloud">
                    <path d={svgPaths.p3c611d30} id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </g>
                </svg>
              </div>
              <div className="absolute left-[786.06px] size-[32px] top-[8px]" data-name="Container">
                <div className="absolute border-2 border-[#8a847d] border-solid left-0 rounded-[10px] size-[32px] top-0" data-name="Container" />
                <Wrapper5 additionalClassNames="left-0 top-0">
                  <g id="Send">
                    <path d={svgPaths.p3b9ac400} id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d={svgPaths.p2ea72d40} id="Vector_2" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </g>
                </Wrapper5>
              </div>
            </div>
            <div className="absolute gap-x-[32px] gap-y-[32px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[__minmax(0,365fr)_minmax(0,1fr)] h-[774px] left-0 top-[96px] w-[1280px]" data-name="Container">
              <div className="bg-white col-1 justify-self-stretch relative rounded-[24px] row-1 self-stretch shrink-0" data-name="Container">
                <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]" />
                <div className="absolute bg-[#f8f6f4] h-[43px] left-[25px] rounded-[14px] top-[25px] w-[99.922px]" data-name="Container">
                  <HText text="Colors" additionalClassNames="w-[51.922px]" />
                </div>
                <div className="absolute content-stretch flex flex-col gap-[24px] h-[248px] items-start left-[25px] top-[92px] w-[574px]" data-name="Container">
                  <div className="content-stretch flex flex-col gap-[16px] h-[112px] items-start relative shrink-0 w-full" data-name="Container">
                    <Text text="Base" />
                    <div className="content-stretch flex gap-[16px] h-[72px] items-center relative shrink-0 w-full" data-name="Container">
                      <Container1>
                        <Container additionalClassNames="bg-[#f8f6f4]" />
                        <SpanText text="F8F6F4" additionalClassNames="w-[36.984px]" />
                      </Container1>
                      <Container1>
                        <Container additionalClassNames="bg-white" />
                        <SpanText text="FFFFFF" additionalClassNames="w-[35.156px]" />
                      </Container1>
                      <Container1>
                        <Container additionalClassNames="bg-[#e9e4df]" />
                        <SpanText text="E9E4DF" additionalClassNames="w-[39.359px]" />
                      </Container1>
                      <Container1>
                        <Container additionalClassNames="bg-[#2b2a28]" />
                        <SpanText text="2B2A28" additionalClassNames="w-[40.5px]" />
                      </Container1>
                      <Container1>
                        <Container additionalClassNames="bg-[#8a847d]" />
                        <SpanText text="8A847D" additionalClassNames="w-[42.031px]" />
                      </Container1>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col gap-[16px] h-[112px] items-start relative shrink-0 w-full" data-name="Container">
                    <Text text="Primary" />
                    <div className="content-stretch flex gap-[16px] h-[72px] items-center relative shrink-0 w-full" data-name="Container">
                      <Container1>
                        <Container additionalClassNames="bg-[#ffdbe4]" />
                        <SpanText text="FFDBE4" additionalClassNames="w-[39.563px]" />
                      </Container1>
                      <Container1>
                        <Container additionalClassNames="bg-[#4d989b]" />
                        <SpanText text="4D989B" additionalClassNames="w-[41.172px]" />
                      </Container1>
                      <Container1>
                        <Container additionalClassNames="bg-[#d7efed]" />
                        <SpanText text="D7EFED" additionalClassNames="w-[41.297px]" />
                      </Container1>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white col-2 justify-self-stretch relative rounded-[24px] row-1 self-stretch shrink-0" data-name="Container">
                <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]" />
                <div className="absolute bg-[#f8f6f4] h-[43px] left-[25px] rounded-[14px] top-[25px] w-[111.297px]" data-name="Container">
                  <HText text="Buttons" additionalClassNames="w-[63.297px]" />
                </div>
                <div className="absolute content-stretch flex flex-col gap-[24px] h-[176px] items-start left-[25px] top-[92px] w-[574px]" data-name="Container">
                  <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[repeat(1,minmax(0,1fr))] h-[76px] relative shrink-0 w-full" data-name="Container">
                    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
                      <div className="absolute h-[44px] left-[93.81px] rounded-[33554400px] top-0 w-[91.375px]" data-name="UIButton">
                        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[46px] not-italic text-[16px] text-center text-white top-[8px] whitespace-nowrap">Salvar</p>
                      </div>
                      <PText text="Primary Button" additionalClassNames="top-[52px]" />
                    </div>
                    <div className="col-2 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
                      <div className="absolute bg-white border-2 border-[rgba(0,0,0,0.1)] border-solid h-[48px] left-[88.81px] rounded-[33554400px] top-0 w-[101.359px]" data-name="UIButton">
                        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[49.5px] not-italic text-[#0a0a0a] text-[16px] text-center top-[8px] whitespace-nowrap">Button</p>
                      </div>
                      <PText text="Secondary Button" additionalClassNames="top-[56px]" />
                    </div>
                  </div>
                  <div className="h-[76px] relative shrink-0 w-full" data-name="Container">
                    <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[repeat(1,minmax(0,1fr))] pr-[295px] relative size-full">
                      <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
                        <div className="absolute border-2 border-[rgba(0,0,0,0.1)] border-solid h-[48px] left-[82.44px] rounded-[33554400px] top-0 w-[114.109px]" data-name="UIButton">
                          <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[55.5px] not-italic text-[#0a0a0a] text-[16px] text-center top-[8px] whitespace-nowrap">Cancelar</p>
                        </div>
                        <PText text="Text Button" additionalClassNames="top-[56px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white col-1 justify-self-stretch relative rounded-[24px] row-2 self-stretch shrink-0" data-name="Container">
                <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]" />
                <div className="absolute bg-[#f8f6f4] h-[43px] left-[25px] rounded-[14px] top-[25px] w-[90.734px]" data-name="Container">
                  <HText text="Icons" additionalClassNames="w-[42.734px]" />
                </div>
                <div className="absolute gap-x-[24px] gap-y-[24px] grid grid-cols-[repeat(4,minmax(0,1fr))] grid-rows-[__minmax(0,36fr)_minmax(0,1fr)] h-[112px] left-[25px] top-[92px] w-[574px]" data-name="Container">
                  <div className="col-1 content-stretch flex h-[28px] items-start justify-center justify-self-stretch relative row-1 shrink-0" data-name="Container">
                    <Icon>
                      <path d={svgPaths.pcaab480} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      <path d="M17.5 5.83333L22.1667 10.5" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                    </Icon>
                  </div>
                  <div className="col-2 content-stretch flex h-[28px] items-start justify-center justify-self-stretch relative row-1 shrink-0" data-name="Container">
                    <Icon>
                      <path d={svgPaths.p618b200} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      <path d={svgPaths.p383fc000} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                    </Icon>
                  </div>
                  <div className="col-3 content-stretch flex h-[28px] items-start justify-center justify-self-stretch relative row-1 shrink-0" data-name="Container">
                    <Icon>
                      <path d={svgPaths.p41ed200} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      <path d={svgPaths.p2c5ba380} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                    </Icon>
                  </div>
                  <div className="col-4 content-stretch flex h-[28px] items-start justify-center justify-self-stretch relative row-1 shrink-0" data-name="Container">
                    <Icon>
                      <path d={svgPaths.p1dcc0100} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                    </Icon>
                  </div>
                  <div className="col-1 content-stretch flex h-[28px] items-start justify-center justify-self-stretch relative row-2 shrink-0" data-name="Container">
                    <Icon>
                      <path d="M9.33333 2.33333V7" id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      <path d="M18.6667 2.33333V7" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      <path d={svgPaths.p57f3600} id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      <path d="M3.5 11.6667H24.5" id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                    </Icon>
                  </div>
                  <div className="col-2 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch relative row-2 self-stretch shrink-0" data-name="Container">
                    <div className="content-stretch flex h-[28px] items-start justify-center relative shrink-0 w-full" data-name="Container">
                      <Icon>
                        <path d={svgPaths.pcaab480} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      </Icon>
                    </div>
                    <PText1 text="Edit" />
                  </div>
                  <div className="col-3 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch relative row-2 self-stretch shrink-0" data-name="Container">
                    <div className="content-stretch flex h-[28px] items-start justify-center relative shrink-0 w-full" data-name="Container">
                      <Icon>
                        <path d="M3.5 7H24.5" id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                        <path d={svgPaths.p3037b3c0} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                        <path d={svgPaths.p29a07480} id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                        <path d="M11.6667 12.8333V19.8333" id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                        <path d="M16.3333 12.8333V19.8333" id="Vector_5" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                      </Icon>
                    </div>
                    <PText1 text="Trash" />
                  </div>
                </div>
              </div>
              <div className="bg-white col-2 justify-self-stretch relative rounded-[24px] row-2 self-stretch shrink-0" data-name="Container">
                <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]" />
                <div className="absolute bg-[#f8f6f4] h-[43px] left-[25px] rounded-[14px] top-[25px] w-[167.828px]" data-name="Container">
                  <div className="absolute h-[27px] left-[24px] top-[8px] w-[119.828px]" data-name="h3">
                    <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[27px] left-0 not-italic text-[#2b2a28] text-[18px] top-[-1px] whitespace-nowrap">{`Inputs & Cards`}</p>
                  </div>
                </div>
                <div className="absolute bg-white border-2 border-[#e9e4df] border-solid h-[260px] left-[25px] rounded-[24px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] top-[92px] w-[574px]" data-name="Container">
                  <div className="absolute content-stretch flex gap-[12px] h-[48px] items-start left-[24px] top-[24px] w-[522px]" data-name="Container">
                    <Container2>
                      <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px" data-name="UICheckbox" />
                    </Container2>
                    <Container3>
                      <Text text="Lista de Destinos" />
                      <ContainerText text="Andre • 02 Abr" />
                    </Container3>
                    <Wrapper1>
                      <div className="h-[20px] overflow-clip relative shrink-0 w-full" data-name="ChevronDown">
                        <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]" data-name="Vector">
                          <div className="absolute inset-[-16.67%_-8.33%]">
                            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 6.66667">
                              <path d={svgPaths.p1b1fa300} id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Wrapper1>
                  </div>
                  <div className="absolute bg-white h-[74px] left-[24px] rounded-[14px] top-[88px] w-[522px]" data-name="UITextarea">
                    <div className="content-stretch flex items-start overflow-clip px-[16px] py-[12px] relative rounded-[inherit] size-full">
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[16px] text-[rgba(43,42,40,0.5)] whitespace-nowrap">Adicionar um comentário...</p>
                    </div>
                    <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[14px]" />
                  </div>
                  <div className="absolute content-stretch flex h-[48px] items-center justify-between left-[24px] top-[184px] w-[522px]" data-name="Container">
                    <div className="h-[42px] relative rounded-[10px] shrink-0 w-[157.609px]" data-name="button">
                      <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center px-[17px] py-px relative size-full">
                        <div className="relative shrink-0 size-[18px]" data-name="Plus">
                          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
                            <g id="Plus">
                              <path d="M3.75 9H14.25" id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                              <path d="M9 3.75V14.25" id="Vector_2" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                            </g>
                          </svg>
                        </div>
                        <Wrapper6 additionalClassNames="h-[24px]">
                          <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[49px] not-italic text-[#8a847d] text-[16px] text-center top-[-2px] whitespace-nowrap">Adicionar tag</p>
                        </Wrapper6>
                      </div>
                    </div>
                    <div className="h-[48px] relative shrink-0 w-[217.484px]" data-name="Container">
                      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-start relative size-full">
                        <div className="flex-[1_0_0] h-[48px] min-h-px min-w-px relative rounded-[33554400px]" data-name="UIButton">
                          <div aria-hidden="true" className="absolute border-2 border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[33554400px]" />
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                            <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[57.5px] not-italic text-[#0a0a0a] text-[16px] text-center top-[10px] whitespace-nowrap">Cancelar</p>
                          </div>
                        </div>
                        <div className="h-[48px] relative rounded-[33554400px] shrink-0 w-[91.375px]" data-name="UIButton">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
                            <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[46px] not-italic text-[16px] text-center text-white top-[10px] whitespace-nowrap">Salvar</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bg-[#4d989b] content-stretch flex items-center justify-center left-[490px] rounded-[33554400px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] size-[56px] top-[24px]" data-name="UIFloatingButton">
                    <Plus />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bg-white border border-[#e9e4df] border-solid h-[295px] left-0 rounded-[24px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)] top-[902px] w-[1280px]" data-name="Container">
              <div className="absolute bg-[#f8f6f4] h-[43px] left-[24px] rounded-[14px] top-[24px] w-[139.016px]" data-name="Container">
                <HText text="Item States" additionalClassNames="w-[91.016px]" />
              </div>
              <div className="absolute gap-x-[24px] gap-y-[24px] grid grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(1,minmax(0,1fr))] h-[178px] left-[24px] top-[91px] w-[1230px]" data-name="Container">
                <div className="col-1 content-stretch flex flex-col gap-[16px] items-start justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
                  <div className="h-[24px] relative shrink-0 w-full" data-name="h4">
                    <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[196.94px] not-italic text-[#2b2a28] text-[16px] text-center top-[-2px] whitespace-nowrap">Default State</p>
                  </div>
                  <Container4 additionalClassNames="h-[84px]">
                    <div className="content-stretch flex gap-[12px] h-[48px] items-start relative shrink-0 w-full" data-name="Container">
                      <Container2>
                        <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px" data-name="UICheckbox" />
                      </Container2>
                      <Container3>
                        <div className="h-[24px] relative shrink-0 w-full" data-name="Container">
                          <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px] whitespace-nowrap">Novo Filme</p>
                        </div>
                        <ContainerText text="Amanda • 02 Abr" />
                      </Container3>
                      <Button />
                    </div>
                  </Container4>
                </div>
                <div className="col-2 content-stretch flex flex-col gap-[16px] items-start justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
                  <div className="h-[24px] relative shrink-0 w-full" data-name="h4">
                    <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[196.91px] not-italic text-[#2b2a28] text-[16px] text-center top-[-2px] whitespace-nowrap">Expanded State</p>
                  </div>
                  <Container4 additionalClassNames="h-[138px]">
                    <div className="content-stretch flex gap-[12px] h-[102px] items-start relative shrink-0 w-full" data-name="Container">
                      <Container2>
                        <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px" data-name="UICheckbox" />
                      </Container2>
                      <Wrapper6 additionalClassNames="h-[102px]">
                        <div className="absolute h-[24px] left-0 top-0 w-[286px]" data-name="Container">
                          <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px] whitespace-nowrap">Novo Filme</p>
                        </div>
                        <Text1 text="Amanda • 02 Abr" />
                        <div className="absolute content-stretch flex gap-[8px] h-[38px] items-center left-0 px-[13px] py-px rounded-[10px] top-[64px] w-[135.406px]" data-name="button">
                          <div aria-hidden="true" className="absolute border border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[10px]" />
                          <Wrapper7>
                            <g id="Plus">
                              <path d="M3.33333 8H12.6667" id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                              <path d="M8 3.33333V12.6667" id="Vector_2" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </g>
                          </Wrapper7>
                          <Wrapper3 additionalClassNames="flex-[1_0_0] min-h-px min-w-px">
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#8a847d] text-[14px] text-center whitespace-nowrap">Adicionar tag</p>
                          </Wrapper3>
                        </div>
                      </Wrapper6>
                      <Wrapper1 additionalClassNames="rounded-[10px]">
                        <div className="flex h-[20px] items-center justify-center relative shrink-0 w-full" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "21" } as React.CSSProperties}>
                          <div className="flex-none rotate-90 w-full">
                            <ChevronRight />
                          </div>
                        </div>
                      </Wrapper1>
                    </div>
                  </Container4>
                </div>
                <div className="col-3 content-stretch flex flex-col gap-[16px] items-start justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
                  <div className="h-[24px] relative shrink-0 w-full" data-name="h4">
                    <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[197.58px] not-italic text-[#2b2a28] text-[16px] text-center top-[-2px] whitespace-nowrap">Done State</p>
                  </div>
                  <div className="bg-white h-[116px] relative rounded-[16px] shrink-0 w-full" data-name="Container">
                    <div aria-hidden="true" className="absolute border-2 border-[#e9e4df] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.04)]" />
                    <div className="absolute content-stretch flex gap-[12px] h-[80px] items-start left-[18px] top-[18px] w-[358px]" data-name="Container">
                      <Container2>
                        <div className="flex-[1_0_0] h-[20px] min-h-px min-w-px" data-name="UICheckbox" />
                      </Container2>
                      <Wrapper6 additionalClassNames="h-[80px]">
                        <div className="absolute h-[24px] left-0 opacity-60 top-0 w-[286px]" data-name="Container">
                          <p className="[text-decoration-skip-ink:none] absolute decoration-solid font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 line-through not-italic text-[#0a0a0a] text-[16px] top-[-2px] whitespace-nowrap">Novo Filme</p>
                        </div>
                        <Text1 text="Amanda • 02 Abr" />
                        <div className="absolute content-stretch flex gap-[8px] h-[20px] items-center left-0 top-[60px] w-[286px]" data-name="Container">
                          <Wrapper7>
                            <g id="Check">
                              <path d={svgPaths.p39be50} id="Vector" stroke="var(--stroke-0, #8A847D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </g>
                          </Wrapper7>
                          <Wrapper3 additionalClassNames="shrink-0 w-[30.5px]">
                            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#8a847d] text-[14px] whitespace-nowrap">Feito</p>
                          </Wrapper3>
                        </div>
                      </Wrapper6>
                      <Button />
                    </div>
                    <div className="absolute bg-[#4d989b] content-stretch flex items-center justify-center left-[328px] rounded-[33554400px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] size-[48px] top-[50px]" data-name="button">
                      <Plus />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}